import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Alert, Snackbar } from '@mui/material';
import { signInWithGoogle } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import { Google as GoogleIcon } from '@mui/icons-material';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already signed in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const user = await signInWithGoogle();
      setAlert({
        open: true,
        message: `Welcome ${user.displayName}!`,
        severity: 'success'
      });
      navigate('/');
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
        minHeight: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme => theme.palette.background.gradient,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 100% 0%, rgba(124, 58, 237, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 0% 100%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        },
      }}
    >
      <Box
        sx={{
          p: 4,
          maxWidth: 400,
          width: '90%',
          borderRadius: 2,
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #7C3AED 0%, #10B981 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 4,
          }}
        >
          Campus Connect
        </Typography>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={handleGoogleSignIn}
          disabled={loading}
          startIcon={<GoogleIcon />}
          sx={{
            py: 1.5,
            backgroundColor: 'white',
            color: 'text.primary',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
            },
          }}
        >
          Sign in with Google
        </Button>
      </Box>
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

export default Login;
