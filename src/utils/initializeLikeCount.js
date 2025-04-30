import { collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const initializeLikeCount = async () => {
  try {
    const listingsRef = collection(db, 'listings');
    const querySnapshot = await getDocs(listingsRef);

    const updatePromises = querySnapshot.docs
      .filter(doc => !doc.data().likes)
      .map(doc => updateDoc(doc.ref, { likes: 0 }));

    await Promise.all(updatePromises);
    console.log('Successfully initialized like counts for all listings');
  } catch (error) {
    console.error('Error initializing like counts:', error);
    throw error; // Propagate the error for better error handling
  }
};
