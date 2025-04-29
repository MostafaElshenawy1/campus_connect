import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBJE9vi3zBJgJCPPGrZtrhlZQQMHvB7Xd4",
  authDomain: "campus-connect-11877.firebaseapp.com",
  projectId: "campus-connect-11877",
  storageBucket: "campus-connect-11877.firebasestorage.app",
  messagingSenderId: "379013888917",
  appId: "1:379013888917:web:51a5c48e1bc49f957c149c",
  measurementId: "G-RWLFDELDRE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Configure Google Auth Provider to only allow .edu emails
googleProvider.setCustomParameters({
  hd: 'edu' // This restricts sign-in to .edu domains
});

export default app;
