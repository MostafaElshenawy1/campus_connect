import {
  collection,
  query,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
  getDoc,
  setDoc,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth } from 'firebase/auth';

// Helper function to create a conversation ID that's consistent between two users
const createConversationId = (userId1, userId2, listingId = null) => {
  const sortedIds = [userId1, userId2].sort();
  return listingId
    ? `${sortedIds[0]}_${sortedIds[1]}_${listingId}`
    : `${sortedIds[0]}_${sortedIds[1]}`;
};

// Send a message to another user
export const sendMessage = async (receiverId, content, isOffer = false, offerAmount = null, listingId = null) => {
  const auth = getAuth();
  const senderId = auth.currentUser?.uid;

  if (!senderId) throw new Error('User not authenticated');
  if (!receiverId) throw new Error('Receiver ID is required');
  if (!isOffer) {
    if (!content || !content.trim()) throw new Error('Message content is required');
  } else {
    if (typeof offerAmount !== 'number' || isNaN(offerAmount)) throw new Error('Offer amount is required for offers');
    if (offerAmount <= 0) throw new Error('Offer amount must be positive');
  }

  try {
    // Create conversation document first
    const conversationId = createConversationId(senderId, receiverId, listingId);
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    // Create message data
    const messageData = {
      senderId,
      receiverId,
      content,
      timestamp: serverTimestamp(),
      isOffer,
      offerAmount,
      listingId,
      read: false,
      status: isOffer ? 'pending' : null
    };

    // If conversation doesn't exist, create it first
    if (!conversationDoc.exists()) {
      // Get the receiver's user data
      const receiverDoc = await getDoc(doc(db, 'users', receiverId));
      const receiverData = receiverDoc.exists() ? receiverDoc.data() : null;

      // Get the listing data if available
      let listingData = null;
      if (listingId) {
        const listingDoc = await getDoc(doc(db, 'listings', listingId));
        if (listingDoc.exists()) {
          listingData = {
            id: listingId,
            ...listingDoc.data()
          };
        }
      }

      const conversationData = {
        participants: [senderId, receiverId],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: messageData,
        listingId: listingId,
        [`unreadCount_${receiverId}`]: 1,
        [`unreadCount_${senderId}`]: 0,
        user: receiverData,
        listing: listingData
      };

      // Create conversation first
      await setDoc(conversationRef, conversationData);
    } else {
      // Update existing conversation
      await updateDoc(conversationRef, {
        lastMessage: messageData,
        updatedAt: serverTimestamp(),
        [`unreadCount_${receiverId}`]: increment(1)
      });
    }

    // Now add the message to the messages subcollection
    const messagesRef = collection(conversationRef, 'messages');
    const newMessageRef = doc(messagesRef);
    await setDoc(newMessageRef, messageData);

    return {
      messageId: newMessageRef.id,
      conversationId,
      ...messageData
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Get messages for a conversation
export const getMessages = async (conversationId) => {
  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('User not authenticated');

  try {
    console.log('Getting messages for conversation:', conversationId);

    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }

    const data = conversationDoc.data();
    if (!data.participants.includes(currentUserId)) {
      throw new Error('User not authorized to view this conversation');
    }

    // Get messages from the subcollection
    const messagesQuery = query(
      collection(conversationRef, 'messages'),
      orderBy('timestamp', 'desc')
    );

    const messagesSnapshot = await getDocs(messagesQuery);
    console.log('Messages found:', messagesSnapshot.size);

    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Mark received messages as read
    const batch = writeBatch(db);
    let unreadCount = 0;

    messages.forEach(message => {
      if (message.receiverId === currentUserId && !message.read) {
        const messageRef = doc(conversationRef, 'messages', message.id);
        batch.update(messageRef, { read: true });
        unreadCount++;
      }
    });

    if (unreadCount > 0) {
      batch.update(conversationRef, {
        [`unreadCount_${currentUserId}`]: 0
      });
      await batch.commit();
    }

    return messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

// Handle offer response (accept/reject)
export const handleOfferResponse = async (conversationId, messageId, accept) => {
  const auth = getAuth();
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('User not authenticated');

  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const messageRef = doc(conversationRef, 'messages', messageId);

    const messageDoc = await getDoc(messageRef);
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const message = messageDoc.data();
    if (!message.isOffer) {
      throw new Error('This message is not an offer');
    }

    if (message.receiverId !== currentUserId) {
      throw new Error('Only the receiver can respond to an offer');
    }

    const batch = writeBatch(db);

    // Update message status
    batch.update(messageRef, {
      status: accept ? 'accepted' : 'rejected'
    });

    // Update conversation's last message
    batch.update(conversationRef, {
      'lastMessage.status': accept ? 'accepted' : 'rejected'
    });

    if (accept && message.listingId) {
      // Mark the listing as sold
      const listingRef = doc(db, 'listings', message.listingId);
      batch.update(listingRef, {
        sold: true,
        soldTo: message.senderId,
        soldAt: serverTimestamp()
      });
    }

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error handling offer response:', error);
    throw error;
  }
};

// Mark message as read
export const markMessageAsRead = async (messageId) => {
  try {
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      read: true
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};
