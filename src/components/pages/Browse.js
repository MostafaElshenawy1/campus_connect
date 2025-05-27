import React, { useState, useEffect, useCallback } from 'react';
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
  CircularProgress,
  Alert,
  Chip,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { collection, query, orderBy, getDocs, doc, arrayUnion, arrayRemove, getDoc, writeBatch, increment } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import ListingCard from '../common/ListingCard';

const locations = ['Dorms', 'Dark Side', 'Light Side', 'Other'];
const categories = ['All', 'Electronics', 'Furniture', 'Books', 'Clothing', 'Other'];
const conditions = ['All', 'New', 'Like New', 'Good', 'Fair', 'Poor'];

function Browse() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: 'All',
    condition: 'All',
    priceRange: [0, 1000],
    location: 'All',
    search: '',
  });
  const [priceInputs, setPriceInputs] = useState({ min: 0, max: 1000 });
  const [pricePresets] = useState([
    { label: 'Under $50', range: [0, 50] },
    { label: '$50 - $100', range: [50, 100] },
    { label: '$100 - $200', range: [100, 200] },
    { label: '$200 - $500', range: [200, 500] },
    { label: '$500 - $1000', range: [500, 990] },
    { label: '1000+', range: [1000, 1000] },
  ]);
  const [sortBy, setSortBy] = useState('newest');
  const [allListings, setAllListings] = useState([]);
  const [displayedListings, setDisplayedListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [likedListings, setLikedListings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAllListings();
  }, []);

  const applyFiltersAndSort = useCallback(async () => {
    let filteredListings = [...allListings];

    // Exclude sold listings
    filteredListings = filteredListings.filter(listing => !listing.sold);

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

    // Special handling for price range
    filteredListings = filteredListings.filter(listing => {
      const price = listing.price;
      const [min, max] = filters.priceRange;

      if (max === 1000) {
        // For 1000+, show all listings with price >= min
        return price >= min;
      } else {
        // For normal ranges, show items <= max
        return price >= min && price <= max;
      }
    });

    switch (sortBy) {
      case 'newest':
        filteredListings.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        filteredListings.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'trending':
        filteredListings.sort((a, b) => {
          const likesA = a.likes || 0;
          const likesB = b.likes || 0;
          if (likesA === likesB) {
            // If likes are equal, sort by creation date (newest first)
            return b.createdAt - a.createdAt;
          }
          return likesB - likesA;
        });
        break;
      case 'price-asc':
        filteredListings.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filteredListings.sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }

    setDisplayedListings(filteredListings);

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
  }, [allListings, filters, searchQuery, sortBy]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  useEffect(() => {
    // Find the maximum price from all listings
    if (allListings.length > 0) {
      const max = Math.max(...allListings.map(listing => listing.price));
      // Cap at 1000 for the slider
      const newMaxPrice = Math.min(1000, Math.ceil(max / 10) * 10);
      setFilters(prev => ({
        ...prev,
        priceRange: [prev.priceRange[0], Math.min(prev.priceRange[1], newMaxPrice)]
      }));
    }
  }, [allListings]);

  const fetchAllListings = async () => {
    setLoading(true);
    try {
      const listingsRef = collection(db, 'listings');
      const q = query(listingsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const listingsData = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          likes: doc.data().likes || 0
        }))
        .filter(listing => !listing.sold);
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

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handlePriceInputChange = (field, value) => {
    // Remove any non-digit characters
    const numericValue = value.replace(/\D/g, '');
    if (numericValue === '') {
      setPriceInputs(prev => ({ ...prev, [field]: '' }));
      return;
    }

    // Convert to number and check if negative
    const numValue = Number(numericValue);
    if (numValue < 0) return;

    // Cap at 1000 for the slider
    const cappedValue = Math.min(1000, numValue);

    // Update the input value
    setPriceInputs(prev => ({ ...prev, [field]: cappedValue }));

    // Update the price range
    const newRange = [...filters.priceRange];
    if (field === 'min') {
      newRange[0] = cappedValue;
    } else {
      newRange[1] = cappedValue;
    }
    setFilters(prev => ({ ...prev, priceRange: newRange }));
  };

  const handlePricePresetClick = (range) => {
    setFilters(prev => ({ ...prev, priceRange: range }));
    setPriceInputs({ min: range[0], max: range[1] });
  };

  const handlePriceRangeChange = (event, newValue) => {
    setFilters(prev => ({ ...prev, priceRange: newValue }));
    setPriceInputs({ min: newValue[0], max: newValue[1] });
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
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Min Price"
              value={priceInputs.min === 0 ? '0' : priceInputs.min}
              onChange={(e) => handlePriceInputChange('min', e.target.value)}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Max Price"
              value={priceInputs.max === 1000 ? '1000+' : priceInputs.max}
              onChange={(e) => handlePriceInputChange('max', e.target.value)}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
              size="small"
            />
          </Grid>
        </Grid>
      </Box>

      <Slider
        value={filters.priceRange}
        onChange={handlePriceRangeChange}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => value === 1000 ? '1000+' : `$${value}`}
        min={0}
        max={1000}
        step={10}
        marks={[
          { value: 0, label: '$0' },
          { value: 250, label: '$250' },
          { value: 500, label: '$500' },
          { value: 750, label: '$750' },
          { value: 1000, label: '$1000+' }
        ]}
        sx={{ mb: 2 }}
      />

      <Typography variant="subtitle2" gutterBottom>
        Quick Select
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {pricePresets.map((preset) => (
          <Chip
            key={preset.label}
            label={preset.label}
            onClick={() => handlePricePresetClick(preset.range)}
            color={filters.priceRange[0] === preset.range[0] && filters.priceRange[1] === preset.range[1] ? 'primary' : 'default'}
            variant={filters.priceRange[0] === preset.range[0] && filters.priceRange[1] === preset.range[1] ? 'filled' : 'outlined'}
            sx={{ mb: 1 }}
          />
        ))}
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
                Sort By: {sortBy === 'newest' ? 'Newest First' :
                  sortBy === 'oldest' ? 'Oldest First' :
                    sortBy === 'trending' ? 'Trending' :
                      sortBy === 'price-asc' ? 'Price: Low to High' :
                        'Price: High to Low'}
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
        <MenuItem onClick={() => handleSortChange('trending')}>
          <ListItemIcon>
            <TrendingUpIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Trending</ListItemText>
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
                <Box sx={{ mb: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Min Price"
                        value={priceInputs.min === 0 ? '0' : priceInputs.min}
                        onChange={(e) => handlePriceInputChange('min', e.target.value)}
                        InputProps={{
                          startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                        }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Max Price"
                        value={priceInputs.max === 1000 ? '1000+' : priceInputs.max}
                        onChange={(e) => handlePriceInputChange('max', e.target.value)}
                        InputProps={{
                          startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                        }}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Slider
                  value={filters.priceRange}
                  onChange={handlePriceRangeChange}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => value === 1000 ? '1000+' : `$${value}`}
                  min={0}
                  max={1000}
                  step={10}
                  marks={[
                    { value: 0, label: '$0' },
                    { value: 250, label: '$250' },
                    { value: 500, label: '$500' },
                    { value: 750, label: '$750' },
                    { value: 1000, label: '$1000+' }
                  ]}
                  sx={{ mb: 2 }}
                />

                <Typography variant="subtitle2" gutterBottom>
                  Quick Select
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {pricePresets.map((preset) => (
                    <Chip
                      key={preset.label}
                      label={preset.label}
                      onClick={() => handlePricePresetClick(preset.range)}
                      color={filters.priceRange[0] === preset.range[0] && filters.priceRange[1] === preset.range[1] ? 'primary' : 'default'}
                      variant={filters.priceRange[0] === preset.range[0] && filters.priceRange[1] === preset.range[1] ? 'filled' : 'outlined'}
                      sx={{ mb: 1 }}
                    />
                  ))}
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
