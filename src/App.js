import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { CircularProgress } from '@mui/material';
import Browse from './components/pages/Browse';
import CreateListing from './components/pages/CreateListing';
import EditListing from './components/pages/EditListing';
import Profile from './components/pages/Profile';
import Messages from './components/pages/Messages';
import Groups from './components/pages/Groups';
import ListingDetails from './components/pages/ListingDetails';
import MyListings from './components/pages/MyListings';
import LikedListings from './components/pages/LikedListings';
import { onAuthStateChanged } from 'firebase/auth';
import Login from './components/Login';
import ProtectedRoute from './components/common/ProtectedRoute';
import { initializeLikeCount } from './utils/initializeLikeCount';
import theme from './theme';
import Navbar from './components/common/Navbar';
import { auth } from './config/firebase';

// Create a wrapper component to handle the Navbar visibility
function AppContent({ user }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/signin';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: theme.palette.background.gradient,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          backgroundImage: `
            radial-gradient(circle at 100% 0%, rgba(124, 58, 237, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 0% 100%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        },
      }}
    >
      {!isLoginPage && <Navbar user={user} />}
      <Box
        component="main"
        sx={{
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Routes>
          {/* Public route */}
          <Route
            path="/signin"
            element={user ? <Navigate to="/" replace /> : <Login />}
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute user={user}>
                <Browse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-listing"
            element={
              <ProtectedRoute user={user}>
                <CreateListing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-listing/:id"
            element={
              <ProtectedRoute user={user}>
                <EditListing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups"
            element={
              <ProtectedRoute user={user}>
                <Groups />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute user={user}>
                <Profile user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/*"
            element={
              <ProtectedRoute user={user}>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-listings"
            element={
              <ProtectedRoute user={user}>
                <MyListings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/liked-listings"
            element={
              <ProtectedRoute user={user}>
                <LikedListings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/listings/:id"
            element={
              <ProtectedRoute user={user}>
                <ListingDetails />
              </ProtectedRoute>
            }
          />

          {/* Catch all route - redirect to home if authenticated, signin if not */}
          <Route
            path="*"
            element={user ? <Navigate to="/" replace /> : <Navigate to="/signin" replace />}
          />
        </Routes>
      </Box>
    </Box>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
      setUser(user);
      setLoading(false);
    });

    // Initialize like counts for existing listings
    initializeLikeCount();

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppContent user={user} />
      </Router>
    </ThemeProvider>
  );
}

export default App;
