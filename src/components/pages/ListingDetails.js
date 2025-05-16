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
  Stack,
  Chip,
  Avatar,
  Alert,
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { handleLike, getLikeCount, formatLikeCount, checkIfLiked } from '../../services/likes';
import ListingImageSlider from '../common/ListingImageSlider';
import { sendMessage } from '../../services/messages';
import { markListingAsSold, unmarkListingAsSold } from '../../services/firestore';

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seller, setSeller] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isMarkingSold, setIsMarkingSold] = useState(false);
  const [soldDialogOpen, setSoldDialogOpen] = useState(false);
  const [soldPrice, setSoldPrice] = useState('');
  const [soldPriceError, setSoldPriceError] = useState('');
  const [isUnmarkingSold, setIsUnmarkingSold] = useState(false);

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
      navigate(`/messages?conversation=${result.conversationId}`);
    } catch (error) {
      console.error('Error sending message:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      setError(error.message || 'Failed to send message. Please try again.');
    }
  };

  const handleKeyPress = (e) => {
    const { name } = e.target;
    if (name === 'offerAmount') {
      // Only allow numbers and control keys (backspace, delete, etc)
      const char = String.fromCharCode(e.which);
      if (!/[\d]/.test(char) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
      }
    }
  };

  const handleOfferChange = (e) => {
    const { value } = e.target;

    // Remove any non-digit characters
    const numericValue = value.replace(/\D/g, '');
    if (numericValue === '') {
      setOfferAmount('');
      return;
    }

    // Convert to number and check if negative or exceeds max
    const numValue = Number(numericValue);
    if (numValue < 0) {
      return;
    }

    // If number exceeds max, set to max value
    const finalValue = numValue > 99999 ? 99999 : numValue;

    // Format with commas
    const formattedValue = finalValue.toLocaleString();

    setOfferAmount(formattedValue);
  };

  const handleSendOffer = async () => {
    if (!auth.currentUser) {
      navigate('/signin');
      return;
    }

    if (!offerAmount) {
      setError('Please enter a valid offer amount');
      return;
    }

    try {
      console.log('Starting to send offer...');
      console.log('Current user:', auth.currentUser?.uid);
      console.log('Seller ID:', listing.userId);
      console.log('Offer amount:', offerAmount);
      console.log('Listing ID:', listing.id);

      // Remove commas and convert to number for storage
      const numericAmount = Number(offerAmount.replace(/,/g, ''));

      // First send the offer
      const offerResult = await sendMessage(
        listing.userId, // receiverId
        `Offer: $${offerAmount}`, // content
        true, // isOffer
        numericAmount, // offerAmount
        listing.id // listingId
      );

      console.log('Offer sent successfully:', offerResult);

      // If there's a message, send it as a separate message
      if (message.trim()) {
        await sendMessage(
          listing.userId,
          message.trim(),
          false, // not an offer
          null,
          listing.id
        );
      }

      setOfferDialogOpen(false);
      setOfferAmount('');
      setMessage('');

      // Navigate to messages with the conversation ID
      navigate(`/messages?conversation=${offerResult.conversationId}`);
    } catch (error) {
      console.error('Error sending offer:', error);
      setError('Failed to send offer. Please try again.');
    }
  };

  const handleMarkAsSold = () => {
    setSoldPrice(listing.price);
    setSoldDialogOpen(true);
  };

  const handleSoldDialogClose = () => {
    setSoldDialogOpen(false);
    setSoldPriceError('');
  };

  const handleSoldDialogConfirm = async () => {
    const numericPrice = Number(String(soldPrice).replace(/,/g, ''));
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setSoldPriceError('Please enter a valid price');
      return;
    }
    setIsMarkingSold(true);
    try {
      await markListingAsSold(id, numericPrice);
      setListing(prev => ({ ...prev, sold: true, price: numericPrice }));
      setSoldDialogOpen(false);
      setSoldPriceError('');
    } catch (error) {
      setError('Failed to mark as sold');
    } finally {
      setIsMarkingSold(false);
    }
  };

  const handleUnmarkAsSold = async () => {
    setIsUnmarkingSold(true);
    try {
      await unmarkListingAsSold(id);
      setListing(prev => ({ ...prev, sold: false }));
    } catch (error) {
      setError('Failed to unmark as sold');
    } finally {
      setIsUnmarkingSold(false);
    }
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
                {listing.sold && (
                  <>
                    <Chip label="Sold" color="success" sx={{ mb: 1 }} />
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={handleUnmarkAsSold}
                      disabled={isUnmarkingSold}
                      sx={{ mb: 1 }}
                    >
                      {isUnmarkingSold ? <CircularProgress size={24} /> : 'Unmark as Sold'}
                    </Button>
                  </>
                )}
                {!listing.sold && (
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleMarkAsSold}
                    fullWidth
                    disabled={isMarkingSold}
                    sx={{ mb: 1 }}
                  >
                    {isMarkingSold ? <CircularProgress size={24} /> : 'Mark as Sold'}
                  </Button>
                )}
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                  fullWidth
                  disabled={listing.sold}
                >
                  Edit Listing
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteDialogOpen(true)}
                  fullWidth
                  disabled={listing.sold}
                >
                  Delete Listing
                </Button>
              </Stack>
            ) : (
              <Stack spacing={2}>
                {listing.sold ? (
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'background.paper',
                    border: '1.5px solid',
                    borderColor: 'success.light',
                    borderRadius: 2,
                    px: 2,
                    py: 2,
                    boxShadow: 1,
                    gap: 2,
                  }}>
                    <Chip label="Sold" color="success" sx={{ fontWeight: 700, fontSize: 16, px: 1.5, height: 32 }} />
                    <Typography variant="subtitle1" color="success.main" sx={{ fontWeight: 600 }}>
                      This item has already been sold.
                    </Typography>
                  </Box>
                ) : (
                  <>
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
                  </>
                )}
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
            name="offerAmount"
            type="text"
            fullWidth
            value={offerAmount}
            onChange={handleOfferChange}
            onKeyPress={handleKeyPress}
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
            placeholder="Add any additional details or questions about your offer..."
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

      {/* Sold Price Dialog */}
      <Dialog open={soldDialogOpen} onClose={handleSoldDialogClose}>
        <DialogTitle>Mark as Sold</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Sold Price ($)"
            type="number"
            fullWidth
            value={soldPrice}
            onChange={e => setSoldPrice(e.target.value)}
            error={!!soldPriceError}
            helperText={soldPriceError}
            inputProps={{ min: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSoldDialogClose}>Cancel</Button>
          <Button onClick={handleSoldDialogConfirm} variant="contained" color="success" disabled={isMarkingSold}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ListingDetails;
