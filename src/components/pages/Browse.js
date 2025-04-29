import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Paper,
  TextField,
  InputAdornment,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Drawer,
  IconButton,
  useTheme,
  useMediaQuery,
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
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, writeBatch, limit, increment } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import ListingCard from '../common/ListingCard';

const locations = ['Dorms', 'Dark Side', 'Light Side', 'Other'];
const categories = ['All', 'Electronics', 'Furniture', 'Books', 'Clothing', 'Other'];
const conditions = ['All', 'New', 'Like New', 'Good', 'Fair', 'Poor'];

function Browse() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: 'All',
    condition: 'All',
    priceRange: [0, 2000],
    location: 'All',
    search: '',
  });
  const [sortBy, setSortBy] = useState('newest');
  const [allListings, setAllListings] = useState([]);
  const [displayedListings, setDisplayedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedListings, setLikedListings] = useState([]);
  const [selectedImages, setSelectedImages] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllListings();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [filters, sortBy, searchQuery, allListings]);

  const fetchAllListings = async () => {
    setLoading(true);
    try {
      const listingsRef = collection(db, 'listings');
      const q = query(listingsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const listingsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        likes: doc.data().likes || 0
      }));
      setAllListings(listingsData);
      setDisplayedListings(listingsData);
      setError(null);

      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setLikedListings(userDoc.data().likedListings || []);
        }
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      setError(`Error loading listings: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = async () => {
    let filteredListings = [...allListings];

    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase().trim();
      filteredListings = filteredListings.filter(listing =>
        listing.title.toLowerCase().includes(searchLower)
      );
    }

    if (filters.category !== 'All') {
      filteredListings = filteredListings.filter(listing =>
        listing.category === filters.category
      );
    }

    if (filters.condition !== 'All') {
      filteredListings = filteredListings.filter(listing =>
        listing.condition === filters.condition
      );
    }

    if (filters.location !== 'All') {
      filteredListings = filteredListings.filter(listing =>
        listing.location === filters.location
      );
    }

    filteredListings = filteredListings.filter(listing =>
      listing.price >= filters.priceRange[0] && listing.price <= filters.priceRange[1]
    );

    switch (sortBy) {
      case 'newest':
        filteredListings.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        filteredListings.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'price-asc':
        filteredListings.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filteredListings.sort((a, b) => b.price - a.price);
        break;
    }

    setDisplayedListings(filteredListings);

    const initialSelectedImages = {};
    filteredListings.forEach(listing => {
      initialSelectedImages[listing.id] = 0;
    });
    setSelectedImages(initialSelectedImages);

    try {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setLikedListings(userDoc.data().likedListings || []);
        }
      }
    } catch (error) {
      console.error('Error fetching liked listings:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handlePriceRangeChange = (event, newValue) => {
    setFilters(prev => ({ ...prev, tempPriceRange: newValue }));
  };

  const handlePriceRangeChangeCommitted = (event, newValue) => {
    setFilters(prev => ({
      ...prev,
      priceRange: newValue,
      tempPriceRange: newValue
    }));
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    setFilterAnchorEl(null);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setFilters(prev => ({ ...prev, search: searchQuery }));
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleViewClick = (listingId) => {
    navigate(`/listings/${listingId}`);
  };

  const handleEditClick = (listingId) => {
    navigate(`/edit-listing/${listingId}`);
  };

  const handleMessageClick = (listingId) => {
    navigate(`/messages?listing=${listingId}`);
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

      setDisplayedListings(prev => prev.map(listing => {
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
        wasLiked ? [...prev, listingId] : prev.filter(id => id !== listingId)
      );

      setDisplayedListings(prev => prev.map(listing => {
        if (listing.id === listingId) {
          return {
            ...listing,
            likes: (listing.likes || 0) + (wasLiked ? 1 : -1)
          };
        }
        return listing;
      }));

      console.error('Error in like operation:', error);
      setError(`Error updating like: ${error.message}`);
    }
  };

  const handlePreviousImage = (listingId, e) => {
    e.stopPropagation();
    setSelectedImages(prev => {
      const currentIndex = prev[listingId];
      const newIndex = currentIndex === 0 ? displayedListings.find(l => l.id === listingId).images.length - 1 : currentIndex - 1;
      return { ...prev, [listingId]: newIndex };
    });
  };

  const handleNextImage = (listingId, e) => {
    e.stopPropagation();
    setSelectedImages(prev => {
      const currentIndex = prev[listingId];
      const newIndex = currentIndex === displayedListings.find(l => l.id === listingId).images.length - 1 ? 0 : currentIndex + 1;
      return { ...prev, [listingId]: newIndex };
    });
  };

  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const filterContent = (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Filters
      </Typography>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Location</InputLabel>
        <Select
          value={filters.location}
          label="Location"
          onChange={(e) => handleFilterChange('location', e.target.value)}
        >
          <MenuItem value="All">All Locations</MenuItem>
          {locations.map((location) => (
            <MenuItem key={location} value={location}>
              {location}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={filters.category}
          label="Category"
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          {categories.map((category) => (
            <MenuItem key={category} value={category}>
              {category}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Condition</InputLabel>
        <Select
          value={filters.condition}
          label="Condition"
          onChange={(e) => handleFilterChange('condition', e.target.value)}
        >
          {conditions.map((condition) => (
            <MenuItem key={condition} value={condition}>
              {condition}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography gutterBottom>Price Range</Typography>
      <Slider
        value={filters.tempPriceRange || filters.priceRange}
        onChange={handlePriceRangeChange}
        onChangeCommitted={handlePriceRangeChangeCommitted}
        valueLabelDisplay="auto"
        min={0}
        max={2000}
        step={10}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography>${filters.tempPriceRange?.[0] || filters.priceRange[0]}</Typography>
        <Typography>${filters.tempPriceRange?.[1] || filters.priceRange[1]}</Typography>
      </Box>

      <Button
        variant="contained"
        fullWidth
        onClick={toggleDrawer}
        sx={{ mt: 2 }}
      >
        Apply Filters
      </Button>
    </Box>
  );

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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Browse Listings
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <form onSubmit={handleSearchSubmit}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search listings..."
                value={searchQuery}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton type="submit">
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={handleFilterClick}
                endIcon={<FilterIcon />}
              >
                Sort By
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleFilterClose}
      >
        <MenuItem onClick={() => handleSortChange('newest')}>
          <ListItemIcon>
            <TimeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Newest First</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('oldest')}>
          <ListItemIcon>
            <TimeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Oldest First</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('price-asc')}>
          <ListItemIcon>
            <TrendingUpIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Price: Low to High</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleSortChange('price-desc')}>
          <ListItemIcon>
            <TrendingUpIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Price: High to Low</ListItemText>
        </MenuItem>
      </Menu>

      <Box sx={{ my: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Paper>
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Filters
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={filters.location}
                    label="Location"
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                  >
                    <MenuItem value="All">All Locations</MenuItem>
                    {locations.map((location) => (
                      <MenuItem key={location} value={location}>
                        {location}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.category}
                    label="Category"
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Condition</InputLabel>
                  <Select
                    value={filters.condition}
                    label="Condition"
                    onChange={(e) => handleFilterChange('condition', e.target.value)}
                  >
                    {conditions.map((condition) => (
                      <MenuItem key={condition} value={condition}>
                        {condition}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Typography gutterBottom>Price Range</Typography>
                <Slider
                  value={filters.tempPriceRange || filters.priceRange}
                  onChange={handlePriceRangeChange}
                  onChangeCommitted={handlePriceRangeChangeCommitted}
                  valueLabelDisplay="auto"
                  min={0}
                  max={2000}
                  step={10}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography>${filters.tempPriceRange?.[0] || filters.priceRange[0]}</Typography>
                  <Typography>${filters.tempPriceRange?.[1] || filters.priceRange[1]}</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={9}>
            {error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            ) : displayedListings.length > 0 ? (
              <Grid container spacing={3}>
                {displayedListings.map((listing) => (
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
                  No listings found
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Box>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
      >
        <Box sx={{ width: 300, p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Filters</Typography>
            <IconButton onClick={toggleDrawer}>
              <CloseIcon />
            </IconButton>
          </Box>
          {filterContent}
        </Box>
      </Drawer>
    </Container>
  );
}

export default Browse;
