import { handleLike, getLikeCount } from '../../services/likes';
import { auth, db } from '../../config/firebase';
import {
  doc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment,
  getDoc,
} from 'firebase/firestore';

// Mock Firebase modules
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
  })),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  writeBatch: jest.fn(() => ({
    update: jest.fn(),
    commit: jest.fn().mockRejectedValue(new Error('Listing not found')),
  })),
  arrayUnion: jest.fn((item) => item),
  arrayRemove: jest.fn((item) => item),
  increment: jest.fn((value) => value),
  getDoc: jest.fn(),
}));

// Mock the firebase config
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

describe('LikesService', () => {
  let originalConsoleError;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Store original console.error
    originalConsoleError = console.error;
  });

  afterEach(() => {
    // Restore original console.error
    console.error = originalConsoleError;
  });

  describe('handleLike', () => {
    it('likeItem_authenticated_succeeds', async () => {
      // Set up auth mock for this test
      auth.currentUser = { uid: 'U1' };

      // Mock data
      const listingId = 'L1';
      const userId = 'U1';
      const isLiked = false;
      const onSuccess = jest.fn();
      const onError = jest.fn();

      // Setup mocks
      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(),
      };
      writeBatch.mockReturnValue(mockBatch);
      const mockUserRef = {};
      const mockListingRef = {};
      doc.mockReturnValueOnce(mockUserRef);
      doc.mockReturnValueOnce(mockListingRef);

      // Execute the function
      await handleLike(listingId, isLiked, onSuccess, onError);

      // Assertions
      expect(doc).toHaveBeenCalledTimes(2);
      expect(doc).toHaveBeenCalledWith(db, 'users', userId);
      expect(doc).toHaveBeenCalledWith(db, 'listings', listingId);
      expect(writeBatch).toHaveBeenCalledWith(db);
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.update).toHaveBeenCalledWith(mockUserRef, {
        likedListings: arrayUnion(listingId),
      });
      expect(mockBatch.update).toHaveBeenCalledWith(mockListingRef, {
        likes: increment(1),
      });
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('unlikeItem_authenticated_succeeds', async () => {
      // Set up auth mock for this test
      auth.currentUser = { uid: 'U2' };

      // Mock data
      const listingId = 'L2';
      const userId = 'U2';
      const isLiked = true;
      const onSuccess = jest.fn();
      const onError = jest.fn();

      // Setup mocks
      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(),
      };
      writeBatch.mockReturnValue(mockBatch);
      const mockUserRef = {};
      const mockListingRef = {};
      doc.mockReturnValueOnce(mockUserRef);
      doc.mockReturnValueOnce(mockListingRef);

      // Execute the function
      await handleLike(listingId, isLiked, onSuccess, onError);

      // Assertions
      expect(doc).toHaveBeenCalledTimes(2);
      expect(doc).toHaveBeenCalledWith(db, 'users', userId);
      expect(doc).toHaveBeenCalledWith(db, 'listings', listingId);
      expect(writeBatch).toHaveBeenCalledWith(db);
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.update).toHaveBeenCalledWith(mockUserRef, {
        likedListings: arrayRemove(listingId),
      });
      expect(mockBatch.update).toHaveBeenCalledWith(mockListingRef, {
        likes: increment(-1),
      });
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(-1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('likeItem_alreadyLiked_noOp', async () => {
      // Set up auth mock for this test
      auth.currentUser = { uid: 'U3' };

      // Mock data
      const listingId = 'L3';
      const userId = 'U3';
      const isLiked = true; // Already liked
      const onSuccess = jest.fn();
      const onError = jest.fn();

      // Setup mocks
      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(),
      };
      writeBatch.mockReturnValue(mockBatch);
      const mockUserRef = {};
      const mockListingRef = {};
      doc.mockReturnValueOnce(mockUserRef);
      doc.mockReturnValueOnce(mockListingRef);

      // Execute the function
      await handleLike(listingId, isLiked, onSuccess, onError);

      // Assertions
      expect(doc).toHaveBeenCalledTimes(2);
      expect(doc).toHaveBeenCalledWith(db, 'users', userId);
      expect(doc).toHaveBeenCalledWith(db, 'listings', listingId);
      expect(writeBatch).toHaveBeenCalledWith(db);
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.update).toHaveBeenCalledWith(mockUserRef, {
        likedListings: arrayRemove(listingId),
      });
      expect(mockBatch.update).toHaveBeenCalledWith(mockListingRef, {
        likes: increment(-1),
      });
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(-1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('unlikeItem_notLiked_noOp', async () => {
      // Set up auth mock for this test
      auth.currentUser = { uid: 'U4' };

      // Mock data
      const listingId = 'L4';
      const userId = 'U4';
      const isLiked = false; // Not liked
      const onSuccess = jest.fn();
      const onError = jest.fn();

      // Setup mocks
      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(),
      };
      writeBatch.mockReturnValue(mockBatch);
      const mockUserRef = {};
      const mockListingRef = {};
      doc.mockReturnValueOnce(mockUserRef);
      doc.mockReturnValueOnce(mockListingRef);

      // Execute the function
      await handleLike(listingId, isLiked, onSuccess, onError);

      // Assertions
      expect(doc).toHaveBeenCalledTimes(2);
      expect(doc).toHaveBeenCalledWith(db, 'users', userId);
      expect(doc).toHaveBeenCalledWith(db, 'listings', listingId);
      expect(writeBatch).toHaveBeenCalledWith(db);
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.update).toHaveBeenCalledWith(mockUserRef, {
        likedListings: arrayUnion(listingId),
      });
      expect(mockBatch.update).toHaveBeenCalledWith(mockListingRef, {
        likes: increment(1),
      });
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('likeItem_nonExistentListing_throwsNotFound', async () => {
      // Set up auth mock for this test
      auth.currentUser = { uid: 'U5' };

      // Mock data
      const listingId = 'L5';
      const userId = 'U5';
      const isLiked = false;
      const onSuccess = jest.fn();
      const onError = jest.fn();

      // Setup mocks
      const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockRejectedValue(new Error('Listing not found')),
      };
      writeBatch.mockReturnValue(mockBatch);
      const mockUserRef = {};
      const mockListingRef = {};
      doc.mockReturnValueOnce(mockUserRef);
      doc.mockReturnValueOnce(mockListingRef);

      // Suppress console.error for this test
      console.error = jest.fn();

      // Execute the function and expect it to throw
      await expect(
        handleLike(listingId, isLiked, onSuccess, onError)
      ).rejects.toThrow('Listing not found');

      // Assertions
      expect(doc).toHaveBeenCalledTimes(2);
      expect(doc).toHaveBeenCalledWith(db, 'users', userId);
      expect(doc).toHaveBeenCalledWith(db, 'listings', listingId);
      expect(writeBatch).toHaveBeenCalledWith(db);
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.update).toHaveBeenCalledWith(mockUserRef, {
        likedListings: arrayUnion(listingId),
      });
      expect(mockBatch.update).toHaveBeenCalledWith(mockListingRef, {
        likes: increment(1),
      });
      expect(mockBatch.commit).toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getLikeCount', () => {
    it('getLikesCount_returnsCorrectNumber', () => {
      // Test cases
      const testCases = [
        { listing: { likes: 3 }, expected: 3 },
        { listing: { likes: 0 }, expected: 0 },
        { listing: { likes: null }, expected: 0 },
        { listing: { likes: undefined }, expected: 0 },
        { listing: {}, expected: 0 },
      ];

      testCases.forEach(({ listing, expected }) => {
        const result = getLikeCount(listing);
        expect(result).toBe(expected);
      });
    });
  });
});
