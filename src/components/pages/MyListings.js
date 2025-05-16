import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import ListingCard from '../common/ListingCard';
import { handleLike } from '../../services/likes';
import { markListingAsSold } from '../../services/firestore';

function MyListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [likedListings, setLikedListings] = useState([]);
  const navigate = useNavigate();

  const fetchMyListings = useCallback(async () => {
    try {
      const listingsRef = collection(db, 'listings');
      const q = query(
        listingsRef,
        where('userId', '==', auth.currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const listingsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setListings(listingsData);

      // Fetch liked listings
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        setLikedListings(userDoc.data().likedListings || []);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      setError('Error loading listings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyListings();
  }, [fetchMyListings]);

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'listings', selectedListing.id));
      setListings(listings.filter(listing => listing.id !== selectedListing.id));
      setDeleteDialogOpen(false);
      setSelectedListing(null);
    } catch (error) {
      console.error('Error deleting listing:', error);
      setError('Error deleting listing');
    }
  };

  const handleEdit = (listing) => {
    navigate(`/edit-listing/${listing.id}`);
  };

  const handleLikeClick = async (listingId) => {
    try {
      const isLiked = likedListings.includes(listingId);

      // Update local state immediately for better UX
      setLikedListings(prev =>
        isLiked ? prev.filter(id => id !== listingId) : [...prev, listingId]
      );

      setListings(prev => prev.map(listing => {
        if (listing.id === listingId) {
          return {
            ...listing,
            likes: (listing.likes || 0) + (isLiked ? -1 : 1)
          };
        }
        return listing;
      }));

      // Call the centralized like handler
      await handleLike(
        listingId,
        isLiked,
        () => {}, // Success callback not needed as we've already updated UI
        (error) => {
          // Revert local state if the update fails
          setLikedListings(prev =>
            isLiked ? [...prev, listingId] : prev.filter(id => id !== listingId)
          );

          setListings(prev => prev.map(listing => {
            if (listing.id === listingId) {
              return {
                ...listing,
                likes: (listing.likes || 0) + (isLiked ? 1 : -1)
              };
            }
            return listing;
          }));

          console.error('Error in like operation:', error);
          setError('Error updating like');
        }
      );
    } catch (error) {
      console.error('Error in like operation:', error);
      setError('Error updating like');
    }
  };

  const handleMarkAsSold = async (listingId, soldPrice) => {
    try {
      await markListingAsSold(listingId, soldPrice);
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, sold: true, price: soldPrice } : l));
    } catch (error) {
      setError('Failed to mark as sold');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          My Listings
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/create-listing')}
        >
          Create New Listing
        </Button>
      </Box>

      <Grid container spacing={3}>
        {listings.map((listing) => (
          <Grid item xs={12} sm={6} md={4} key={listing.id}>
            <ListingCard
              listing={listing}
              showLikeButton={true}
              showEditButton={!listing.sold}
              showDeleteButton={!listing.sold}
              isLiked={likedListings.includes(listing.id)}
              onLike={handleLikeClick}
              onEdit={handleEdit}
              onDelete={(listing) => {
                setSelectedListing(listing);
                setDeleteDialogOpen(true);
              }}
              onMarkAsSold={(soldPrice) => handleMarkAsSold(listing.id, soldPrice)}
            />
          </Grid>
        ))}
      </Grid>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Listing</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedListing?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default MyListings;
