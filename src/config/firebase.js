import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBJE9vi3zBJgJCPPGrZtrhlZQQMHvB7Xd4",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "campus-connect-11877.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "campus-connect-11877",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "campus-connect-11877.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "379013888917",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:379013888917:web:51a5c48e1bc49f957c149c",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-RWLFDELDRE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics only in browser environment
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes && (analytics = getAnalytics(app)));
}
export { analytics };

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Configure Google Auth Provider to only allow .edu emails
googleProvider.setCustomParameters({
  hd: 'edu' // This restricts sign-in to .edu domains
});

export default app;
