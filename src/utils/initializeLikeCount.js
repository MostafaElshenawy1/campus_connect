import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export const initializeLikeCount = async () => {
  try {
    const listingsRef = collection(db, 'listings');
    const querySnapshot = await getDocs(listingsRef);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.likes) {
        // Initialize likes count if it doesn't exist
        doc.ref.update({ likes: 0 });
      }
    });
  } catch (error) {
    console.error('Error initializing like counts:', error);
  }
};
