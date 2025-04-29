import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Avatar,
  Paper,
  Button,
  Grid,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Edit as EditIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';

const locations = [
  'Dorms',
  'Dark Side',
  'Light Side',
  'Other',
];

function Profile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    customLocation: '',
  });
  const navigate = useNavigate();

  const fetchUserData = async () => {
    try {
      if (!auth.currentUser) {
        navigate('/signin');
        return;
      }

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        const isPredefinedLocation = locations.includes(data.location);
        setUserData(data);
        setFormData({
          displayName: data.displayName || '',
          bio: data.bio || '',
          location: isPredefinedLocation ? data.location : 'Other',
          customLocation: isPredefinedLocation ? '' : data.location,
        });
      } else {
        setUserData({
          displayName: auth.currentUser.displayName,
          photoURL: auth.currentUser.photoURL,
          email: auth.currentUser.email,
          bio: 'No bio available'
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [auth.currentUser, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Clear customLocation if a predefined location is selected
      ...(name === 'location' && value !== 'Other' && { customLocation: '' }),
    }));
  };

  const handleSave = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const updateData = {
        ...formData,
        // Use customLocation if location is "Other"
        location: formData.location === 'Other' ? formData.customLocation : formData.location,
      };

      await updateDoc(userRef, updateData);

      // Update local state with the new data while preserving other fields
      setUserData(prev => ({
        ...prev,
        ...updateData,
        photoURL: prev.photoURL, // Preserve the photo URL
      }));

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Error updating profile');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const storageRef = ref(storage, `profile_images/${auth.currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { photoURL: downloadURL });

      setUserData(prev => ({
        ...prev,
        photoURL: downloadURL
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Error uploading image');
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
      <Paper sx={{ p: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={userData?.photoURL}
                  alt={userData?.displayName}
                  sx={{ width: 150, height: 150, mb: 2 }}
                />
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="icon-button-file"
                  type="file"
                  onChange={handleImageUpload}
                />
                <label htmlFor="icon-button-file">
                  <IconButton
                    color="primary"
                    aria-label="upload picture"
                    component="span"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <PhotoCameraIcon />
                  </IconButton>
                </label>
              </Box>
              <Typography variant="h5" gutterBottom>
                {userData?.displayName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {userData?.email}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={8}>
            {isEditing ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Display Name"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  fullWidth
                />
                <TextField
                  label="Bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Location</InputLabel>
                  <Select
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    label="Location"
                  >
                    {locations.map((location) => (
                      <MenuItem key={location} value={location}>
                        {location}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {formData.location === 'Other' && (
                  <TextField
                    label="Specify Location"
                    name="customLocation"
                    value={formData.customLocation}
                    onChange={handleInputChange}
                    fullWidth
                  />
                )}
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                  >
                    Save
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                </Box>
                <Typography variant="body1" paragraph>
                  {userData?.bio || 'No bio yet'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Location: {userData?.location || 'Not provided'}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}

export default Profile;
