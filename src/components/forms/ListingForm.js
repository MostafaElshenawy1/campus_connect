import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Stack,
  RadioGroup,
  Radio,
  FormControlLabel,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const categories = [
  { value: 'books', label: 'Books & Textbooks' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'clothing', label: 'Clothing & Accessories' },
  { value: 'sports', label: 'Sports Equipment' },
  { value: 'musical', label: 'Musical Instruments' },
  { value: 'other', label: 'Other' },
];

const conditions = [
  { value: 'new', label: 'New' },
  { value: 'like-new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const ImagePreview = styled('img')({
  width: 100,
  height: 100,
  objectFit: 'cover',
  borderRadius: 4,
});

const ListingForm = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    type: 'sell', // 'sell' or 'buy'
    title: '',
    description: '',
    price: '',
    category: '',
    condition: '',
    location: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when field is modified
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else if (isNaN(formData.price) || formData.price <= 0) {
      newErrors.price = 'Please enter a valid price';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (formData.type === 'sell' && !formData.condition) {
      newErrors.condition = 'Condition is required';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (formData.type === 'sell' && images.length === 0) {
      newErrors.images = 'At least one image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);

    if (images.length + files.length > MAX_IMAGES) {
      alert(`You can upload up to ${MAX_IMAGES} images`);
      return;
    }

    const validFiles = files.filter(file => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        alert('Please upload only JPG, PNG, or WebP images');
        return false;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        alert('Maximum file size is 5MB');
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        submitData.append(key, formData[key]);
      });
      images.forEach((image) => {
        submitData.append('images', image.file);
      });

      await axios.post('/api/listings', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      alert('Listing created successfully!');
      navigate('/listings');
    } catch (error) {
      alert(error.response?.data?.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create New Listing
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <Typography variant="subtitle1" gutterBottom>
                    What type of listing would you like to create?
                  </Typography>
                  <RadioGroup
                    row
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                  >
                    <FormControlLabel
                      value="sell"
                      control={<Radio />}
                      label="Sell an Item"
                    />
                    <FormControlLabel
                      value="buy"
                      control={<Radio />}
                      label="Buy an Item"
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  error={!!errors.title}
                  helperText={errors.title}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  error={!!errors.description}
                  helperText={errors.description}
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
                  type="number"
                  value={formData.price}
                  onChange={handleChange}
                  error={!!errors.price}
                  helperText={errors.price}
                  InputProps={{
                    startAdornment: '$',
                  }}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={!!errors.category} required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    label="Category"
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.category && (
                    <FormHelperText>{errors.category}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {formData.type === 'sell' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth error={!!errors.condition} required>
                    <InputLabel>Condition</InputLabel>
                    <Select
                      name="condition"
                      value={formData.condition}
                      onChange={handleChange}
                      label="Condition"
                    >
                      {conditions.map((condition) => (
                        <MenuItem key={condition.value} value={condition.value}>
                          {condition.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.condition && (
                      <FormHelperText>{errors.condition}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  error={!!errors.location}
                  helperText={errors.location}
                  required
                />
              </Grid>

              {formData.type === 'sell' && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<CloudUploadIcon />}
                    >
                      Upload Images
                      <VisuallyHiddenInput
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </Button>
                    {errors.images && (
                      <Typography color="error" variant="caption" sx={{ ml: 2 }}>
                        {errors.images}
                      </Typography>
                    )}
                  </Box>
                  <Grid container spacing={2}>
                    {images.map((image, index) => (
                      <Grid item key={index}>
                        <Box sx={{ position: 'relative' }}>
                          <ImagePreview
                            src={image.preview}
                            alt={`Preview ${index + 1}`}
                          />
                          <IconButton
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              bgcolor: 'background.paper',
                            }}
                            onClick={() => removeImage(index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  setFormData({
                    type: 'sell',
                    title: '',
                    description: '',
                    price: '',
                    category: '',
                    condition: '',
                    location: '',
                  });
                  setImages([]);
                }}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create Listing'}
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default ListingForm;
