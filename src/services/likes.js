import { doc, writeBatch, arrayUnion, arrayRemove, increment, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export const handleLike = async (listingId, isLiked, onSuccess, onError) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('You must be logged in to like items');
    }

    const userRef = doc(db, 'users', user.uid);
    const listingRef = doc(db, 'listings', listingId);

    // Start a batch write
    const batch = writeBatch(db);

    if (isLiked) {
      // Unlike: remove from user's likedListings and decrement listing's like count
      batch.update(userRef, {
        likedListings: arrayRemove(listingId)
      });
      batch.update(listingRef, {
        likes: increment(-1)
      });
    } else {
      // Like: add to user's likedListings and increment listing's like count
      batch.update(userRef, {
        likedListings: arrayUnion(listingId)
      });
      batch.update(listingRef, {
        likes: increment(1)
      });
    }

    // Commit the batch
    await batch.commit();

    // Call success callback with the delta (-1 for unlike, 1 for like)
    if (onSuccess) {
      onSuccess(isLiked ? -1 : 1);
    }
  } catch (error) {
    console.error('Error updating like status:', error);
    if (onError) {
      onError(error);
    }
    throw error;
  }
};

export const getLikeCount = (listing) => {
  return listing.likes || 0;
};

export const formatLikeCount = (count) => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

export const checkIfLiked = async (listingId) => {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return false;

    const userData = userDoc.data();
    return userData.likedListings?.includes(listingId) || false;
  } catch (error) {
    console.error('Error checking like status:', error);
    return false;
  }
};
