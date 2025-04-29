import React, { useState } from 'react';
import { Box, Button, Stack, Typography, Alert, Snackbar } from '@mui/material';
import { signInWithGoogle, signOutUser } from '../services/auth';

const TestAuth = () => {
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const user = await signInWithGoogle();
      setAlert({
        open: true,
        message: `Welcome ${user.displayName}!`,
        severity: 'success'
      });
    } catch (error) {
      setAlert({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOutUser();
      setAlert({
        open: true,
        message: 'You have been signed out successfully',
        severity: 'info'
      });
    } catch (error) {
      setAlert({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  return (
    <Box
      sx={{
        p: 4,
        maxWidth: 500,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 3,
        mx: 'auto',
        my: 4
      }}
    >
      <Stack spacing={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Test Authentication
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Try signing in with your .edu email address
        </Typography>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          Sign in with Google
        </Button>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          onClick={handleSignOut}
          disabled={loading}
        >
          Sign Out
        </Button>
      </Stack>
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TestAuth;
