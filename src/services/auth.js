import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider, db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export const signInWithGoogle = async () => {
  const MAX_RETRIES = 2;
  let retryCount = 0;
  let lastError;

  while (retryCount < MAX_RETRIES) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if the email is from a .edu domain
      if (!user.email.endsWith('.edu')) {
        await signOut(auth);
        throw new Error('Only .edu email addresses are allowed');
      }

      // Create or update user document in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Create new user document with creation date
        await setDoc(userRef, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: new Date(),
          likedListings: [],
          bookmarkedListings: []
        });
      }

      return user;
    } catch (error) {
      lastError = error;
      // Only retry on network errors
      if (error.code === 'network-error') {
        retryCount++;
        if (retryCount < MAX_RETRIES) {
          continue; // Try again
        }
      }
      throw error; // Throw other errors or if max retries reached
    }
  }

  throw lastError; // Throw the last error if all retries failed
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
