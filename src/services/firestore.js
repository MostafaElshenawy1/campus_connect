import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Listings
export const listingsCollection = collection(db, 'listings');

export const createListing = async (listingData) => {
  try {
    const docRef = await addDoc(listingsCollection, {
      ...listingData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const getListing = async (id) => {
  try {
    const docRef = doc(db, 'listings', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

export const getListings = async (filters = {}, lastDoc = null, pageSize = 10) => {
  try {
    let q = query(listingsCollection);

    // Apply filters
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }
    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }

    // Apply sorting
    q = query(q, orderBy('createdAt', 'desc'));

    // Apply pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    q = query(q, limit(pageSize));

    const querySnapshot = await getDocs(q);
    const listings = [];
    querySnapshot.forEach((doc) => {
      listings.push({ id: doc.id, ...doc.data() });
    });

    return {
      listings,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
    };
  } catch (error) {
    throw error;
  }
};

export const updateListing = async (id, listingData) => {
  try {
    const docRef = doc(db, 'listings', id);
    await updateDoc(docRef, {
      ...listingData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

export const deleteListing = async (id) => {
  try {
    const docRef = doc(db, 'listings', id);
    await deleteDoc(docRef);
  } catch (error) {
    throw error;
  }
};

export const markListingAsSold = async (id, soldPrice) => {
  try {
    const docRef = doc(db, 'listings', id);
    await updateDoc(docRef, {
      sold: true,
      soldAt: serverTimestamp(),
      price: soldPrice,
    });
  } catch (error) {
    throw error;
  }
};

export const unmarkListingAsSold = async (id) => {
  try {
    const docRef = doc(db, 'listings', id);
    await updateDoc(docRef, {
      sold: false,
      soldAt: null,
      soldTo: null,
      // Optionally, you can keep the price or set it to null
      // price: null,
    });
  } catch (error) {
    throw error;
  }
};

// Users
export const usersCollection = collection(db, 'users');

export const createUserProfile = async (userId, userData) => {
  try {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

export const getUserProfile = async (userId) => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

export const updateUserProfile = async (userId, userData) => {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      ...userData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};
