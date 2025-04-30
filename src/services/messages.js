import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  writeBatch,
  or,
  getDoc,
  setDoc,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth } from 'firebase/auth';

// Helper function to create a conversation ID that's consistent between two users
const createConversationId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('_');
};

// Send a message to another user
export const sendMessage = async (receiverId, content, isOffer = false, offerAmount = null, listingId = null) => {
  const auth = getAuth();
  const senderId = auth.currentUser?.uid;

  if (!senderId) throw new Error('User not authenticated');
  if (!receiverId) throw new Error('Receiver ID is required');
  if (!content) throw new Error('Message content is required');

  console.log('Send Message Details:');
  console.log('- Auth state:', !!auth.currentUser);
  console.log('- Sender ID:', senderId);
  console.log('- Receiver ID:', receiverId);
  console.log('- Content:', content);
  console.log('- Is Offer:', isOffer);
  console.log('- Offer Amount:', offerAmount);
  console.log('- Listing ID:', listingId);

  try {
    // Create conversation document first
    const conversationId = createConversationId(senderId, receiverId);
    console.log('Generated Conversation ID:', conversationId);

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

    console.log('Message Data:', messageData);

    // If conversation doesn't exist, create it first
    if (!conversationDoc.exists()) {
      console.log('Creating new conversation');

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
      console.log('New conversation data:', conversationData);

      // Create conversation first
      await setDoc(conversationRef, conversationData);
      console.log('Conversation created successfully');
    } else {
      // Update existing conversation
      console.log('Updating existing conversation');
      await updateDoc(conversationRef, {
        lastMessage: messageData,
        updatedAt: serverTimestamp(),
        [`unreadCount_${receiverId}`]: increment(1)
      });
      console.log('Conversation updated successfully');
    }

    // Now add the message to the messages subcollection
    const messagesRef = collection(conversationRef, 'messages');
    const newMessageRef = doc(messagesRef);
    console.log('Adding message to subcollection:', newMessageRef.id);

    await setDoc(newMessageRef, messageData);
    console.log('Message added successfully');

    return {
      messageId: newMessageRef.id,
      conversationId,
      ...messageData
    };
  } catch (error) {
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details
    });
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
