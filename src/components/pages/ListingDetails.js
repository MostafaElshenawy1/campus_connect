import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Menu,
  ListItemIcon,
  ListItemText,
  Avatar,
  styled,
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Share as ShareIcon,
  Message as MessageIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, writeBatch, increment, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { handleLike, getLikeCount, formatLikeCount, checkIfLiked } from '../../services/likes';
import ListingImageSlider from '../common/ListingImageSlider';
import { sendMessage } from '../../services/messages';

// Styled components for image transitions
const ImageContainer = styled(Box)({
  position: 'relative',
  overflow: 'hidden',
  height: '400px',
  width: '100%',
  borderRadius: '8px',
});

const ImageSlider = styled(Box)({
  display: 'flex',
  height: '100%',
  transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  willChange: 'transform',
});

const StyledImage = styled('img')({
  minWidth: '100%',
  height: '100%',
  objectFit: 'cover',
  flexShrink: 0,
});

const NavigationButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  zIndex: 2,
}));

function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seller, setSeller] = useState(null);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const listingRef = doc(db, 'listings', id);
        const listingDoc = await getDoc(listingRef);

        if (!listingDoc.exists()) {
          setError('Listing not found');
          return;
        }

        const listingData = {
          id: listingDoc.id,
          ...listingDoc.data()
        };

        setListing(listingData);
        setLikeCount(getLikeCount(listingData));

        // Fetch seller information
        if (listingData.userId) {
          const userRef = doc(db, 'users', listingData.userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            setSeller(userDoc.data());
          }
        }

        // Check if current user has liked this listing
        const liked = await checkIfLiked(id);
        setIsLiked(liked);
      } catch (error) {
        console.error('Error fetching listing:', error);
        setError('Error loading listing');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  const handleLikeClick = async () => {
    if (!auth.currentUser) {
      navigate('/signin');
      return;
    }

    try {
      // Update UI immediately for better UX
      setLikeCount(prev => prev + (isLiked ? -1 : 1));
      setIsLiked(!isLiked);

      await handleLike(
        id,
        isLiked,
        () => {}, // Success callback not needed as we've already updated UI
        (error) => {
          // Revert UI changes if the server update fails
          setLikeCount(prev => prev + (isLiked ? 1 : -1));
          setIsLiked(isLiked);
          console.error('Error liking:', error);
        }
      );
    } catch (error) {
      // Revert UI changes if there's an error
      setLikeCount(prev => prev + (isLiked ? 1 : -1));
      setIsLiked(isLiked);
      console.error('Error in like operation:', error);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: listing.title,
          text: listing.description,
          url: window.location.href
        });
      } else {
        // Fallback for browsers that don't support Web Share API
        await navigator.clipboard.writeText(window.location.href);
        // You might want to show a snackbar/toast here
      }
    } catch (error) {
      // Ignore the "Share canceled" error
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'listings', id));
      navigate('/my-listings');
    } catch (error) {
      console.error('Error deleting listing:', error);
      setError('Error deleting listing');
    }
  };

  const handleEdit = () => {
    navigate(`/edit-listing/${id}`);
  };

  const handleSendMessage = async () => {
    if (!auth.currentUser) {
      console.log('User not authenticated, redirecting to signin');
      navigate('/signin');
      return;
    }

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    try {
      console.log('Starting to send message...');
      console.log('Auth state:', {
        currentUser: auth.currentUser?.uid,
        isAuthenticated: !!auth.currentUser
      });
      console.log('Message details:', {
        sellerId: listing.userId,
        message: message.trim(),
        listingId: listing.id
      });

      const result = await sendMessage(
        listing.userId,
        message.trim(),
        false,
        null,
        listing.id
      );

      console.log('Message sent successfully:', result);
      setMessageDialogOpen(false);
      setMessage('');
      navigate('/messages');
    } catch (error) {
      console.error('Error sending message:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      setError(error.message || 'Failed to send message. Please try again.');
    }
  };

  const handleSendOffer = async () => {
    if (!auth.currentUser) {
      navigate('/signin');
      return;
    }

    if (!offerAmount || isNaN(offerAmount) || parseFloat(offerAmount) <= 0) {
      setError('Please enter a valid offer amount');
      return;
    }

    try {
      console.log('Starting to send offer...');
      console.log('Current user:', auth.currentUser?.uid);
      console.log('Seller ID:', listing.userId);
      console.log('Offer amount:', offerAmount);
      console.log('Listing ID:', listing.id);

      const result = await sendMessage(
        listing.userId, // receiverId
        `Offer: $${offerAmount}`, // content
        true, // isOffer
        parseFloat(offerAmount), // offerAmount
        listing.id // listingId
      );

      console.log('Offer sent successfully:', result);
      setOfferDialogOpen(false);
      setOfferAmount('');
      setMessage('');

      // Navigate to messages after sending
      navigate('/messages');
    } catch (error) {
      console.error('Error sending offer:', error);
      setError('Failed to send offer. Please try again.');
    }
  };

  const handlePreviousImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? listing.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === listing.images.length - 1 ? 0 : prev + 1
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
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

  const isOwner = auth.currentUser && listing.userId === auth.currentUser.uid;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <ListingImageSlider
              images={listing.images}
              height="400px"
              showDots={true}
            />
            <Typography variant="h4" component="h1" gutterBottom>
              {listing.title}
            </Typography>
            <Typography variant="h5" color="primary" gutterBottom>
              ${listing.price}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip
                icon={<LocationIcon />}
                label={listing.location || 'No location specified'}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={listing.category || 'Uncategorized'}
                color="secondary"
                variant="outlined"
              />
              <Chip
                label={listing.condition || 'Condition not specified'}
                color="info"
                variant="outlined"
              />
            </Stack>
            <Typography variant="body1" paragraph>
              {listing.description}
            </Typography>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            {/* Seller Information */}
            {seller && (
              <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={seller.photoURL}
                  alt={seller.displayName}
                  sx={{ width: 56, height: 56 }}
                />
                <Box>
                  <Typography variant="h6">{seller.displayName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Member since {seller.createdAt ? new Date(seller.createdAt.toDate()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
              <IconButton
                onClick={handleLikeClick}
                color={isLiked ? 'primary' : 'default'}
                sx={{
                  transition: 'transform 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
              >
                {isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              </IconButton>
              <Typography variant="body2" color="text.secondary">
                {formatLikeCount(likeCount)}
              </Typography>
              <IconButton onClick={handleShare}>
                <ShareIcon />
              </IconButton>
            </Box>

            {isOwner ? (
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                  fullWidth
                >
                  Edit Listing
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteDialogOpen(true)}
                  fullWidth
                >
                  Delete Listing
                </Button>
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={() => setOfferDialogOpen(true)}
                >
                  Send an Offer
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setMessageDialogOpen(true)}
                >
                  Message Seller
                </Button>
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onClose={() => setMessageDialogOpen(false)}>
        <DialogTitle>Send Message to Seller</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Message"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSendMessage} variant="contained">
            Send
          </Button>
        </DialogActions>
      </Dialog>

      {/* Offer Dialog */}
      <Dialog open={offerDialogOpen} onClose={() => setOfferDialogOpen(false)}>
        <DialogTitle>Make an Offer</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Offer Amount ($)"
            type="number"
            fullWidth
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Additional Message (Optional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOfferDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSendOffer} variant="contained" color="primary">
            Send Offer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Listing</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this listing? This action cannot be undone.
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

export default ListingDetails;
