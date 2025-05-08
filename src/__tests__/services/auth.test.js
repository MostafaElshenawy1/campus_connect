import { signInWithGoogle } from '../../services/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Mock Firebase modules
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null
  })),
  GoogleAuthProvider: jest.fn(() => ({})),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({})),
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
}));

// Mock the firebase config
jest.mock('../../config/firebase', () => ({
  auth: {},
  googleProvider: {},
  db: {},
  storage: {},
}));

describe('AuthService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('signInWithGoogle', () => {
    it('should sign in with valid .edu email and create new user record', async () => {
      // Mock user data
      const mockUser = {
        email: 'alice@uni.edu',
        uid: 'U1',
        displayName: 'Alice Smith',
        photoURL: 'https://example.com/photo.jpg'
      };

      // Mock successful sign in
      const mockSignInResult = {
        user: mockUser
      };

      // Mock Firestore document
      const mockUserDoc = {
        exists: () => false
      };

      // Setup mocks
      const { signInWithPopup } = require('firebase/auth');
      signInWithPopup.mockResolvedValue(mockSignInResult);
      getDoc.mockResolvedValue(mockUserDoc);
      doc.mockReturnValue({});

      // Execute the function
      const result = await signInWithGoogle();

      // Assertions
      expect(signInWithPopup).toHaveBeenCalled();
      expect(doc).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledTimes(1);
      expect(setDoc).toHaveBeenCalledWith(
        {},
        {
          displayName: mockUser.displayName,
          email: mockUser.email,
          photoURL: mockUser.photoURL,
          createdAt: expect.any(Date),
          likedListings: [],
          bookmarkedListings: []
        }
      );
      expect(result).toEqual(mockUser);
    });

    it('signInWithGoogle_nonEduEmail_throwsDomainError', async () => {
      // Mock user data with non-.edu email
      const mockUser = {
        email: 'bob@gmail.com',
        uid: 'U2',
        displayName: 'Bob Smith',
        photoURL: 'https://example.com/photo.jpg'
      };

      // Mock successful sign in
      const mockSignInResult = {
        user: mockUser
      };

      // Setup mocks
      const { signInWithPopup } = require('firebase/auth');
      signInWithPopup.mockResolvedValue(mockSignInResult);

      // Execute the function and expect it to reject
      await expect(signInWithGoogle()).rejects.toThrow('Only .edu email addresses are allowed');
    });

    it('signInWithGoogle_invalidPopupError_propagates', async () => {
      // Mock error from signInWithPopup
      const mockError = { code: 'auth/wrong-password', message: 'Bad creds' };

      // Setup mocks
      const { signInWithPopup } = require('firebase/auth');
      signInWithPopup.mockRejectedValue(mockError);

      // Execute the function and expect it to reject with the same error
      await expect(signInWithGoogle()).rejects.toEqual(mockError);
    });

    it('signInWithGoogle_existingUser_noFirestoreWrite', async () => {
      // Mock user data
      const mockUser = {
        email: 'carol@uni.edu',
        uid: 'U3',
        displayName: 'Carol Smith',
        photoURL: 'https://example.com/photo.jpg'
      };

      // Mock successful sign in
      const mockSignInResult = {
        user: mockUser
      };

      // Mock Firestore document
      const mockUserDoc = {
        exists: () => true,
        data: () => ({
          displayName: mockUser.displayName,
          email: mockUser.email,
          photoURL: mockUser.photoURL,
          createdAt: new Date(),
          likedListings: [],
          bookmarkedListings: []
        })
      };

      // Setup mocks
      const { signInWithPopup } = require('firebase/auth');
      signInWithPopup.mockResolvedValue(mockSignInResult);
      getDoc.mockResolvedValue(mockUserDoc);

      // Execute the function
      const result = await signInWithGoogle();

      // Assertions
      expect(signInWithPopup).toHaveBeenCalled();
      expect(doc).toHaveBeenCalled();
      expect(setDoc).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('signInWithGoogle_newUser_createsFirestoreRecord', async () => {
      // Mock user data
      const mockUser = {
        email: 'dave@uni.edu',
        uid: 'U4',
        displayName: 'Dave Smith',
        photoURL: 'https://example.com/photo.jpg'
      };

      // Mock successful sign in
      const mockSignInResult = {
        user: mockUser
      };

      // Mock Firestore document
      const mockUserDoc = {
        exists: () => false
      };

      // Setup mocks
      const { signInWithPopup } = require('firebase/auth');
      signInWithPopup.mockResolvedValue(mockSignInResult);
      getDoc.mockResolvedValue(mockUserDoc);
      const mockDocRef = {};
      doc.mockReturnValue(mockDocRef);

      // Execute the function
      const result = await signInWithGoogle();

      // Assertions
      expect(signInWithPopup).toHaveBeenCalled();
      expect(doc).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledTimes(1);
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        {
          displayName: mockUser.displayName,
          email: mockUser.email,
          photoURL: mockUser.photoURL,
          createdAt: expect.any(Date),
          likedListings: [],
          bookmarkedListings: []
        }
      );
      expect(result).toEqual(mockUser);
    });

    it('signInWithGoogle_networkError_retriesAndSucceeds', async () => {
      // Mock user data
      const mockUser = {
        email: 'eve@uni.edu',
        uid: 'U5',
        displayName: 'Eve Smith',
        photoURL: 'https://example.com/photo.jpg'
      };

      // Mock successful sign in result
      const mockSignInResult = {
        user: mockUser
      };

      // Mock network error
      const mockNetworkError = {
        code: 'network-error',
        message: 'Network error occurred'
      };

      // Mock Firestore document (new user)
      const mockUserDoc = {
        exists: () => false
      };

      // Setup mocks
      const { signInWithPopup } = require('firebase/auth');
      signInWithPopup
        .mockRejectedValueOnce(mockNetworkError)  // First call fails
        .mockResolvedValueOnce(mockSignInResult); // Second call succeeds
      getDoc.mockResolvedValue(mockUserDoc);
      const mockDocRef = {};
      doc.mockReturnValue(mockDocRef);

      // Execute the function
      const result = await signInWithGoogle();

      // Assertions
      expect(signInWithPopup).toHaveBeenCalledTimes(2); // Called twice
      expect(doc).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledTimes(1);
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        {
          displayName: mockUser.displayName,
          email: mockUser.email,
          photoURL: mockUser.photoURL,
          createdAt: expect.any(Date),
          likedListings: [],
          bookmarkedListings: []
        }
      );
      expect(result).toEqual(mockUser);
    });
  });
});
