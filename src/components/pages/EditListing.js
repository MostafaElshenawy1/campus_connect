import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton,
  Stack,
  Snackbar,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { auth } from '../../config/firebase';
import { keyframes } from '@mui/system';

// Add shake animation
const shake = keyframes`
  0% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
  100% { transform: translateX(0); }
`;

const categories = [
  'Books',
  'Electronics',
  'Furniture',
  'Clothing',
  'Sports',
  'Other',
];

const conditions = [
  'New',
  'Like New',
  'Good',
  'Fair',
  'Poor',
];

const locations = [
  'Dorms',
  'Dark Side',
  'Light Side',
  'Other',
];

function EditListing() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [listing, setListing] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    condition: '',
    location: '',
    customLocation: '',
    images: [],
  });
  const [newImages, setNewImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);

  const fetchListing = useCallback(async () => {
    setLoading(true);

    try {
      const docRef = doc(db, 'listings', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const isPredefinedLocation = locations.includes(data.location);
        setListing({
          ...data,
          location: isPredefinedLocation ? data.location : 'Other',
          customLocation: isPredefinedLocation ? '' : data.location,
          images: data.images || data.imageUrls || [],
          price: data.price.toLocaleString(),
        });
      } else {
        setSnackbarOpen(true);
      }
    } catch (err) {
      console.error('Error fetching listing:', err);
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const handleKeyPress = (e) => {
    const { name } = e.target;
    if (name === 'price') {
      // Only allow numbers and control keys (backspace, delete, etc)
      const char = String.fromCharCode(e.which);
      if (!/[\d]/.test(char) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Special handling for price to ensure it's non-negative and only contains numbers
    if (name === 'price') {
      // Remove any non-digit characters
      const numericValue = value.replace(/\D/g, '');
      if (numericValue === '') {
        setListing(prev => ({
          ...prev,
          [name]: '',
        }));
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

      setListing(prev => ({
        ...prev,
        [name]: formattedValue,
      }));
      return;
    }

    setListing(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'location' && value !== 'Other' && { customLocation: '' }),
    }));
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setImageError(`${file.name} is not a valid image file`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setImageError(null);
      setNewImages(prev => [...prev, ...validFiles]);
    }
  };

  const handleRemoveImage = (index, isNew = false) => {
    if (isNew) {
      setNewImages(prev => prev.filter((_, i) => i !== index));
    } else {
      const imageUrl = listing.images[index];
      setImagesToDelete(prev => [...prev, imageUrl]);
      setListing(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
    }
    setImageError(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const uploadImages = async (images) => {
    if (!images?.length) return [];

    const uploadPromises = images.map(async (image) => {
      try {
        const storageRef = ref(storage, `listings/${auth.currentUser.uid}/${Date.now()}-${image.name}`);
        const uploadResult = await uploadBytes(storageRef, image);
        return await getDownloadURL(uploadResult.ref);
      } catch (error) {
        console.error(`Failed to upload image ${image.name}:`, error);
        throw new Error(`Failed to upload ${image.name}`);
      }
    });

    return Promise.all(uploadPromises);
  };

  const deleteImages = async (urls) => {
    if (!urls?.length) return;

    const deletePromises = urls.map(async (url) => {
      try {
        const imageRef = ref(storage, url);
        await deleteObject(imageRef);
      } catch (error) {
        console.error(`Failed to delete image at ${url}:`, error);
      }
    });

    await Promise.allSettled(deletePromises);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if there are any images (either existing or new)
      if (listing.images.length === 0 && newImages.length === 0) {
        setImageError(true);
        setSnackbarOpen(true);
        // Reset image error state after animation completes
        setTimeout(() => {
          setImageError(false);
        }, 500);
        setLoading(false);
        return;
      }

      // Upload new images if any
      let newImageUrls = [];
      if (newImages.length > 0) {
        try {
          newImageUrls = await uploadImages(newImages);
        } catch (error) {
          console.error('Error uploading new images:', error);
          setLoading(false);
          return;
        }
      }

      // Delete removed images if any
      if (imagesToDelete.length > 0) {
        try {
          await deleteImages(imagesToDelete);
        } catch (error) {
          console.error('Error deleting images:', error);
          // Continue with the update even if deletion fails
        }
      }

      // Get the current listing data
      const docRef = doc(db, 'listings', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Listing not found');
      }

      // Prepare the updated data
      const updatedImages = [...listing.images, ...newImageUrls];
      const listingData = {
        ...listing,
        location: listing.location === 'Other' ? listing.customLocation : listing.location,
        updatedAt: serverTimestamp(),
        price: Number(listing.price.replace(/,/g, '')),
        images: updatedImages,
      };

      // Update the listing
      await updateDoc(docRef, listingData);
      navigate('/my-listings');
    } catch (error) {
      console.error('Error updating listing:', error);
      setImageError(error.message || 'Error updating listing');
    } finally {
      setLoading(false);
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
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
          Edit Listing
        </Typography>
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  name="title"
                  value={listing.title}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={listing.description}
                  onChange={handleChange}
                  multiline
                  rows={4}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Price"
                  name="price"
                  type="text"
                  value={listing.price}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={listing.category}
                    onChange={handleChange}
                    label="Category"
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Condition</InputLabel>
                  <Select
                    name="condition"
                    value={listing.condition}
                    onChange={handleChange}
                    label="Condition"
                  >
                    {conditions.map((condition) => (
                      <MenuItem key={condition} value={condition}>
                        {condition}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Location</InputLabel>
                  <Select
                    name="location"
                    value={listing.location}
                    onChange={handleChange}
                    label="Location"
                  >
                    {locations.map((location) => (
                      <MenuItem key={location} value={location}>
                        {location}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {listing.location === 'Other' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Specify Location"
                    name="customLocation"
                    value={listing.customLocation}
                    onChange={handleChange}
                    required
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Images
                </Typography>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    mb: 2,
                    flexWrap: 'wrap',
                    animation: imageError ? `${shake} 0.5s ease-in-out` : 'none',
                  }}
                >
                  {listing.images.map((image, index) => (
                    <Box
                      key={index}
                      sx={{
                        position: 'relative',
                        width: 150,
                        height: 150,
                        borderRadius: 2,
                        overflow: 'hidden',
                        mb: 2,
                      }}
                    >
                      <img
                        src={image}
                        alt={`Item ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'rgba(255, 255, 255, 0.8)',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                          },
                        }}
                        onClick={() => handleRemoveImage(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  {newImages.map((file, index) => (
                    <Box
                      key={`new-${index}`}
                      sx={{
                        position: 'relative',
                        width: 150,
                        height: 150,
                        borderRadius: 2,
                        overflow: 'hidden',
                        mb: 2,
                      }}
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Upload ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          bgcolor: 'rgba(255, 255, 255, 0.8)',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                          },
                        }}
                        onClick={() => handleRemoveImage(index, true)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    sx={{
                      width: 150,
                      height: 150,
                      borderRadius: 2,
                      mb: 2,
                      borderColor: imageError ? 'error.main' : 'divider',
                      '&:hover': {
                        borderColor: imageError ? 'error.main' : 'primary.main',
                      },
                    }}
                  >
                    Add Image
                    <input
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </Button>
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/my-listings')}
                    sx={{ borderRadius: 2 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{ borderRadius: 2 }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
          At least one image is required
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default EditListing;
