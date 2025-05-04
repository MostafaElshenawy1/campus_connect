import React, { useState } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../config/firebase';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
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

function CreateListing() {
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
  });
  const [images, setImages] = useState([]);

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
      // Clear customLocation if a predefined location is selected
      ...(name === 'location' && value !== 'Other' && { customLocation: '' }),
    }));
  };

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

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    setImages(prev => [...prev, ...files]);
    setImageError(false);
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageError(false);
  };

  const uploadImages = async () => {
    try {
      if (images.length === 0) {
        return [];
      }

      const uploadPromises = images.map(async (file) => {
        try {
          const storageRef = ref(storage, `listings/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          return getDownloadURL(snapshot.ref);
        } catch (error) {
          console.error('Error uploading individual image:', error);
          throw new Error(`Failed to upload image: ${file.name}`);
        }
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error in uploadImages:', error);
      throw new Error('Failed to upload images. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!auth.currentUser) {
        throw new Error('You must be logged in to create a listing');
      }

      if (images.length === 0) {
        setImageError(true);
        setSnackbarOpen(true);
        // Reset image error state after animation completes
        setTimeout(() => {
          setImageError(false);
        }, 500);
        throw new Error('At least one image is required');
      }

      // Upload images first
      const imageUrls = await uploadImages();

      // Create listing document
      const listingData = {
        ...listing,
        images: imageUrls,
        userId: auth.currentUser.uid,
        createdAt: new Date(),
        // Remove commas and convert to number for storage
        price: Number(listing.price.replace(/,/g, '')),
        location: listing.location === 'Other' ? listing.customLocation : listing.location,
      };

      await addDoc(collection(db, 'listings'), listingData);
      navigate('/my-listings');
    } catch (error) {
      console.error('Error creating listing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
          Create New Listing
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
                  {images.map((file, index) => (
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
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
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
                    {loading ? <CircularProgress size={24} /> : 'Create Listing'}
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

export default CreateListing;
