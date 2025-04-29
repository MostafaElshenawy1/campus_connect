import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { collection, query, where, getDocs, doc, getDoc, writeBatch, arrayRemove, increment, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import ListingCard from '../common/ListingCard';

function LikedListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedListings, setLikedListings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLikedListings();
  }, []);

  const fetchLikedListings = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/signin');
        return;
      }

      // Get user's liked listings
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const likedListingsIds = userDoc.data()?.likedListings || [];
      setLikedListings(likedListingsIds);

      // Fetch all liked listings
      const listingsData = [];
      for (const listingId of likedListingsIds) {
        const listingRef = doc(db, 'listings', listingId);
        const listingDoc = await getDoc(listingRef);
        if (listingDoc.exists()) {
          listingsData.push({
            id: listingDoc.id,
            ...listingDoc.data()
          });
        }
      }

      setListings(listingsData);
      setError(null);
    } catch (error) {
      console.error('Error fetching liked listings:', error);
      setError(`Error loading liked listings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (listingId) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/signin');
        return;
      }

      const isLiked = likedListings.includes(listingId);
      const userRef = doc(db, 'users', user.uid);
      const listingRef = doc(db, 'listings', listingId);
      const batch = writeBatch(db);

      // Update user's liked listings
      if (isLiked) {
        batch.update(userRef, {
          likedListings: arrayRemove(listingId)
        });
      } else {
        batch.update(userRef, {
          likedListings: arrayUnion(listingId)
        });
      }

      // Update listing's like count
      batch.update(listingRef, {
        likes: increment(isLiked ? -1 : 1)
      });

      // Update local state before the batch commit to make it feel instant
      setLikedListings(prev =>
        isLiked ? prev.filter(id => id !== listingId) : [...prev, listingId]
      );

      // Update the like count in the UI without removing the listing
      setListings(prev => prev.map(listing => {
        if (listing.id === listingId) {
          return {
            ...listing,
            likes: (listing.likes || 0) + (isLiked ? -1 : 1)
          };
        }
        return listing;
      }));

      await batch.commit();
    } catch (error) {
      // Revert local state if the update fails
      const wasLiked = likedListings.includes(listingId);
      setLikedListings(prev =>
        wasLiked ? prev.filter(id => id !== listingId) : [...prev, listingId]
      );

      // Revert the like count in the UI
      setListings(prev => prev.map(listing => {
        if (listing.id === listingId) {
          return {
            ...listing,
            likes: (listing.likes || 0) + (wasLiked ? -1 : 1)
          };
        }
        return listing;
      }));

      console.error('Error in like operation:', error);
      setError(`Error updating like: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Liked Listings
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : listings.length > 0 ? (
        <Grid container spacing={3}>
          {listings.map((listing) => (
            <Grid item xs={12} sm={6} md={4} key={listing.id}>
              <ListingCard
                listing={listing}
                showLikeButton={true}
                isLiked={likedListings.includes(listing.id)}
                onLike={handleLike}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No liked listings found
          </Typography>
        </Box>
      )}
    </Container>
  );
}

export default LikedListings;
