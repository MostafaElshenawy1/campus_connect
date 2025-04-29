import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  InputAdornment,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Category as CategoryIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import ListingCard from '../common/ListingCard';

function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredListings, setFeaturedListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch categories and featured listings from your backend
    const fetchData = async () => {
      try {
        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCategories([]);
        setFeaturedListings([]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSearchResults([]);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 8,
          px: 4,
          borderRadius: 2,
          mb: 4,
          textAlign: 'center',
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom>
          Welcome to StudentMarket
        </Typography>
        <Typography variant="h6" gutterBottom>
          Buy and sell items within your campus community
        </Typography>
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search for items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleSearch}
                    disabled={isSearching}
                  >
                    {isSearching ? <CircularProgress size={24} color="inherit" /> : 'Search'}
                  </Button>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" gutterBottom>
            Search Results
          </Typography>
          <Grid container spacing={3}>
            {searchResults.map((listing) => (
              <Grid item xs={12} sm={6} md={4} key={listing.id}>
                <ListingCard listing={listing} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Categories Section */}
      {categories.length > 0 && (
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <CategoryIcon sx={{ mr: 1 }} />
            Browse Categories
          </Typography>
          <Grid container spacing={2}>
            {categories.map((category) => (
              <Grid item xs={6} sm={4} md={2} key={category.name}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <Typography variant="h4" gutterBottom>
                    {category.icon}
                  </Typography>
                  <Typography variant="subtitle1">{category.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {category.count} items
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Featured Listings Section */}
      {featuredListings.length > 0 && (
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUpIcon sx={{ mr: 1 }} />
            Featured Listings
          </Typography>
          <Grid container spacing={3}>
            {featuredListings.map((listing) => (
              <Grid item xs={12} sm={6} md={4} key={listing.id}>
                <ListingCard listing={listing} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  );
}

export default Home;
