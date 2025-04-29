import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
  Timestamp,
  setDoc,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth } from 'firebase/auth';

// Get the current user's ID
const getCurrentUserId = () => {
  const auth = getAuth();
  return auth.currentUser?.uid;
};

// Create a conversation ID that's consistent between two users
const createConversationId = (userId1, userId2) => {
  // Sort the IDs to ensure the same conversation ID is generated regardless of order
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

// Create a new conversation or get an existing one
export const getOrCreateConversation = async (otherUserId, listingId = null) => {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) throw new Error('User not authenticated');

  try {
    console.log('Creating/getting conversation between:', currentUserId, 'and', otherUserId);

    const conversationId = createConversationId(currentUserId, otherUserId);
    const conversationRef = doc(db, 'conversations', conversationId);

    const conversationDoc = await getDoc(conversationRef);
    console.log('Existing conversation:', conversationDoc.exists());

    if (conversationDoc.exists()) {
      const data = conversationDoc.data();
      console.log('Existing conversation data:', data);
      return { id: conversationId, ...data };
    } else {
      // Create a new conversation
      const newConversation = {
        participants: [currentUserId, otherUserId],
        lastMessage: null,
        unreadCount: 0,
        listingId: listingId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('Creating new conversation:', newConversation);

      // Use setDoc instead of updateDoc for new documents
      await setDoc(conversationRef, newConversation);

      console.log('New conversation created successfully');
      return { id: conversationId, ...newConversation };
    }
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    throw error;
  }
};

// Send a message in a conversation
export const sendMessage = async (receiverId, content, isOffer = false, offerAmount = null, listingId = null) => {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) throw new Error('User not authenticated');

  try {
    console.log('Sending message to:', receiverId);

    // Get or create the conversation first
    const conversation = await getOrCreateConversation(receiverId, listingId);
    console.log('Got conversation:', conversation);

    const conversationId = conversation.id;
    const conversationRef = doc(db, 'conversations', conversationId);

    // Create the message data
    const messageData = {
      content,
      timestamp: serverTimestamp(),
      senderId: currentUserId,
      receiverId,
      isOffer,
      offerAmount,
      status: isOffer ? 'pending' : null,
      read: false
    };

    console.log('Message data:', messageData);

    // Use a batch to update both the conversation and add the message
    const batch = writeBatch(db);

    // Add the message to the messages subcollection
    const messagesRef = collection(conversationRef, 'messages');
    const newMessageRef = doc(messagesRef);
    batch.set(newMessageRef, messageData);

    // Update the conversation document
    batch.update(conversationRef, {
      lastMessage: messageData,
      updatedAt: serverTimestamp(),
      [`unreadCount_${receiverId}`]: increment(1) // Track unread count per user
    });

    console.log('Committing batch write...');
    await batch.commit();
    console.log('Message sent successfully');

    return {
      id: newMessageRef.id,
      conversationId,
      ...messageData
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Get all conversations for the current user
export const getConversations = async () => {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) throw new Error('User not authenticated');

  try {
    console.log('Fetching conversations for user:', currentUserId);

    // Query conversations where the current user is a participant
    const conversationsRef = collection(db, 'conversations');
    let q;

    try {
      // Try with ordering first
      q = query(
        conversationsRef,
        where('participants', 'array-contains', currentUserId),
        orderBy('updatedAt', 'desc')
      );
    } catch (indexError) {
      console.warn('Index not ready, falling back to basic query:', indexError);
      // Fallback to basic query without ordering if index is not ready
      q = query(
        conversationsRef,
        where('participants', 'array-contains', currentUserId)
      );
    }

    const querySnapshot = await getDocs(q);
    console.log('Found conversations:', querySnapshot.size);

    const conversations = [];

    for (const conversationDoc of querySnapshot.docs) {
      const data = conversationDoc.data();
      console.log('Raw conversation data:', data);

      // Find the other participant's ID
      const otherUserId = data.participants.find(id => id !== currentUserId);
      console.log('Other participant ID:', otherUserId);

      // Get the other user's details
      const userRef = doc(db, 'users', otherUserId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : null;
      console.log('Other user data:', userData);

      // Get listing details if available
      let listingData = null;
      if (data.listingId) {
        const listingRef = doc(db, 'listings', data.listingId);
        const listingDoc = await getDoc(listingRef);
        if (listingDoc.exists()) {
          listingData = {
            id: listingDoc.id,
            ...listingDoc.data()
          };
          console.log('Listing data:', listingData);
        }
      }

      // Get the unread count for the current user
      const unreadCount = data[`unreadCount_${currentUserId}`] || 0;

      conversations.push({
        id: conversationDoc.id,
        participants: data.participants,
        userId: otherUserId,
        user: userData,
        listing: listingData,
        lastMessage: data.lastMessage,
        unreadCount,
        updatedAt: data.updatedAt,
        createdAt: data.createdAt
      });
    }

    // If we had to use the fallback query, sort the results in memory
    if (!q._query.orderBy) {
      conversations.sort((a, b) => {
        const timeA = a.updatedAt?.toDate() || new Date(0);
        const timeB = b.updatedAt?.toDate() || new Date(0);
        return timeB - timeA;
      });
    }

    return conversations;
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
};

// Get messages for a specific conversation
export const getMessages = async (conversationId, messageLimit = 50) => {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) throw new Error('User not authenticated');

  try {
    // First, verify the user is a participant in this conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }

    const conversationData = conversationDoc.data();
    if (!conversationData.participants.includes(currentUserId)) {
      throw new Error('User not authorized to view this conversation');
    }

    // Mark messages as read
    await markMessagesAsRead(conversationId);

    // Get messages
    const messagesRef = collection(db, `conversations/${conversationId}/messages`);
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(messageLimit)
    );

    const querySnapshot = await getDocs(q);
    const messages = [];

    querySnapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort messages by timestamp in ascending order
    messages.sort((a, b) => {
      const timeA = a.timestamp?.toDate() || new Date(0);
      const timeB = b.timestamp?.toDate() || new Date(0);
      return timeA - timeB;
    });

    return messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

// Mark all messages in a conversation as read
export const markMessagesAsRead = async (conversationId) => {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) throw new Error('User not authenticated');

  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (!conversationDoc.exists()) {
      throw new Error('Conversation not found');
    }

    const conversationData = conversationDoc.data();
    if (!conversationData.participants.includes(currentUserId)) {
      throw new Error('User not authorized to view this conversation');
    }

    // Update the conversation to reset unread count
    await updateDoc(conversationRef, {
      unreadCount: 0
    });

    // Get all unread messages
    const q = query(
      collection(db, `conversations/${conversationId}/messages`),
      where('receiverId', '==', currentUserId),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);

    // Mark each message as read
    querySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Handle offer response (accept/reject)
export const handleOfferResponse = async (conversationId, messageId, status) => {
  const currentUserId = getCurrentUserId();
  if (!currentUserId) throw new Error('User not authenticated');

  try {
    // Get the message
    const messageRef = doc(db, `conversations/${conversationId}/messages`, messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const messageData = messageDoc.data();

    // Verify the user is the receiver of the offer
    if (messageData.receiverId !== currentUserId) {
      throw new Error('User not authorized to respond to this offer');
    }

    // Update the message status
    await updateDoc(messageRef, {
      status
    });

    // Update the conversation's last message
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      'lastMessage.status': status,
      updatedAt: serverTimestamp()
    });

    return {
      id: messageId,
      ...messageData,
      status
    };
  } catch (error) {
    console.error('Error handling offer response:', error);
    throw error;
  }
};
