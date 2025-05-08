// Mock Firebase auth first
jest.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: { uid: 'SENDER_ID' }
  })
}));

// Mock Firebase modules
const mockServerTimestamp = jest.fn(() => 'MOCK_TIMESTAMP');
const mockIncrement = jest.fn((n) => ({ _increment: n }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: () => mockServerTimestamp(),
  writeBatch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    commit: jest.fn()
  })),
  increment: (n) => mockIncrement(n)
}));

// Mock Firebase config
jest.mock('../../config/firebase', () => ({
  db: {}
}));

// Import after mocks
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  increment
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../config/firebase';
import { sendMessage } from '../../services/messages';

describe('MessagesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServerTimestamp.mockReturnValue('MOCK_TIMESTAMP');
    mockIncrement.mockImplementation((n) => ({ _increment: n }));
  });

  describe('sendMessage', () => {
    it('sendMessage_validContent_writesToFirestore', async () => {
      // Mock data
      const receiverId = 'RECEIVER_ID';
      const content = 'Hello, how are you?';
      const conversationId = 'RECEIVER_ID_SENDER_ID'; // Note: IDs are sorted alphabetically

      // Mock Firestore responses
      const mockConversationRef = {};
      const mockMessagesRef = {};
      const mockNewMessageRef = { id: 'M1' };

      // Setup mocks
      doc.mockImplementation((path) => {
        if (path === db) return mockConversationRef;
        return mockNewMessageRef;
      });

      collection.mockImplementation((ref, path) => mockMessagesRef);
      getDoc.mockResolvedValue({ exists: () => true });

      // Execute the function
      const result = await sendMessage(receiverId, content);

      // Verify the result
      expect(result).toEqual({
        messageId: 'M1',
        conversationId,
        content,
        senderId: 'SENDER_ID',
        receiverId,
        isOffer: false,
        offerAmount: null,
        listingId: null,
        read: false,
        status: null,
        timestamp: 'MOCK_TIMESTAMP'
      });

      // Verify Firestore interactions
      expect(doc).toHaveBeenCalledWith(db, 'conversations', conversationId);
      expect(collection).toHaveBeenCalledWith(mockConversationRef, 'messages');

      // Verify setDoc was called with the message data
      expect(setDoc).toHaveBeenCalledWith(mockNewMessageRef, {
        content,
        senderId: 'SENDER_ID',
        receiverId,
        isOffer: false,
        offerAmount: null,
        listingId: null,
        read: false,
        status: null,
        timestamp: 'MOCK_TIMESTAMP'
      });

      // Verify updateDoc was called with the conversation update
      expect(updateDoc).toHaveBeenCalledWith(mockConversationRef, {
        lastMessage: {
          content,
          senderId: 'SENDER_ID',
          receiverId,
          isOffer: false,
          offerAmount: null,
          listingId: null,
          read: false,
          status: null,
          timestamp: 'MOCK_TIMESTAMP'
        },
        updatedAt: 'MOCK_TIMESTAMP',
        'unreadCount_RECEIVER_ID': { _increment: 1 }
      });
    });

    it('sendMessage_emptyContent_throwsValidationError', async () => {
      // Mock data
      const receiverId = 'RECEIVER_ID';
      const emptyContents = ['', ' ', '   ', '\t', '\n'];

      // Test each empty content variant
      for (const content of emptyContents) {
        // Clear mocks before each iteration
        jest.clearAllMocks();

        // Execute the function and expect it to throw
        await expect(sendMessage(receiverId, content)).rejects.toThrow('Message content is required');

        // Verify no Firestore interactions occurred
        expect(doc).not.toHaveBeenCalled();
        expect(collection).not.toHaveBeenCalled();
        expect(setDoc).not.toHaveBeenCalled();
        expect(updateDoc).not.toHaveBeenCalled();
        expect(getDoc).not.toHaveBeenCalled();
      }
    });

    it('sendOffer_validAmount_writesOffer', async () => {
      // Mock data
      const receiverId = 'RECEIVER_ID';
      const senderId = 'SENDER_ID';
      const listingId = 'LISTING123';
      const offerAmount = 150;
      const conversationId = 'RECEIVER_ID_SENDER_ID_LISTING123';
      const now = 'MOCK_TIMESTAMP';

      // Mock Firestore responses
      const mockConversationRef = {};
      const mockMessagesRef = {};
      const mockNewMessageRef = { id: 'O1' };

      // Setup mocks
      doc.mockImplementation((...args) => {
        // doc(db, 'conversations', conversationId)
        if (args[0] === db && args[1] === 'conversations' && args[2] === conversationId) return mockConversationRef;
        // doc(messagesRef)
        if (args[0] === mockMessagesRef) return mockNewMessageRef;
        // doc(db, 'users', receiverId) or doc(db, 'listings', listingId)
        return {};
      });
      collection.mockImplementation((ref, path) => mockMessagesRef);
      getDoc.mockResolvedValue({ exists: () => true });

      // Execute the function
      const result = await sendMessage(receiverId, null, true, offerAmount, listingId);

      // Offer payload
      const expectedOffer = {
        content: null,
        senderId,
        receiverId,
        isOffer: true,
        offerAmount,
        listingId,
        read: false,
        status: 'pending',
        timestamp: now
      };

      // Result should match
      expect(result).toEqual({
        messageId: 'O1',
        conversationId,
        ...expectedOffer
      });

      // setDoc called with offer
      expect(setDoc).toHaveBeenCalledWith(mockNewMessageRef, expectedOffer);
      // updateDoc called with lastMessage = offer
      expect(updateDoc).toHaveBeenCalledWith(mockConversationRef, {
        lastMessage: expectedOffer,
        updatedAt: now,
        'unreadCount_RECEIVER_ID': { _increment: 1 }
      });
    });

    it('sendOffer_negativeAmount_throwsValidationError', async () => {
      const receiverId = 'RECEIVER_ID';
      const listingId = 'LISTING123';
      const negativeAmounts = [0, -1, -10, -100];

      for (const offerAmount of negativeAmounts) {
        jest.clearAllMocks();
        await expect(sendMessage(receiverId, null, true, offerAmount, listingId))
          .rejects.toThrow('Offer amount must be positive');
        expect(setDoc).not.toHaveBeenCalled();
        expect(updateDoc).not.toHaveBeenCalled();
      }
    });

    it('acceptOffer_pendingOffer_updatesStatusAccepted', async () => {
      const conversationId = 'C1';
      const messageId = 'O1';
      const now = 'MOCK_TIMESTAMP';
      // Mock Firestore doc and getDoc
      const mockMessageRef = {};
      doc.mockImplementation((...args) => {
        // doc(conversationRef, 'messages', messageId)
        if (args[1] === 'messages' && args[2] === messageId) return mockMessageRef;
        // doc(db, 'conversations', conversationId)
        if (args[1] === 'conversations' && args[2] === conversationId) return {};
        return {};
      });
      // getDoc returns a pending offer
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          isOffer: true,
          status: 'pending',
          receiverId: 'SENDER_ID',
          senderId: 'OTHER_ID',
        })
      });
      // updateDoc mock
      updateDoc.mockResolvedValue();
      // writeBatch mock for batch.update and batch.commit
      const mockBatch = { update: jest.fn(), commit: jest.fn().mockResolvedValue() };
      writeBatch.mockReturnValue(mockBatch);
      // Import the function (after mocks)
      const { handleOfferResponse } = await import('../../services/messages');
      // Call accept
      const result = await handleOfferResponse(conversationId, messageId, true);
      // batch.update called with accepted status
      expect(mockBatch.update).toHaveBeenCalledWith(mockMessageRef, {
        status: 'accepted'
      });
      // Optionally, check the second call for lastMessage.status
      expect(mockBatch.update).toHaveBeenCalledWith({}, { 'lastMessage.status': 'accepted' });
      expect(result).toEqual({ success: true });
    });

    it('declineOffer_pendingOffer_updatesStatusDeclined', async () => {
      const conversationId = 'C1';
      const messageId = 'O1';
      // Mock Firestore doc and getDoc
      const mockMessageRef = {};
      doc.mockImplementation((...args) => {
        // doc(conversationRef, 'messages', messageId)
        if (args[1] === 'messages' && args[2] === messageId) return mockMessageRef;
        // doc(db, 'conversations', conversationId)
        if (args[1] === 'conversations' && args[2] === conversationId) return {};
        return {};
      });
      // getDoc returns a pending offer
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          isOffer: true,
          status: 'pending',
          receiverId: 'SENDER_ID',
          senderId: 'OTHER_ID',
        })
      });
      // writeBatch mock for batch.update and batch.commit
      const mockBatch = { update: jest.fn(), commit: jest.fn().mockResolvedValue() };
      writeBatch.mockReturnValue(mockBatch);
      // Import the function (after mocks)
      const { handleOfferResponse } = await import('../../services/messages');
      // Call decline
      const result = await handleOfferResponse(conversationId, messageId, false);
      // batch.update called with declined status
      expect(mockBatch.update).toHaveBeenCalledWith(mockMessageRef, {
        status: 'rejected'
      });
      // Optionally, check the second call for lastMessage.status
      expect(mockBatch.update).toHaveBeenCalledWith({}, { 'lastMessage.status': 'rejected' });
      expect(result).toEqual({ success: true });
    });
  });
});
