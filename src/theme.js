import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7C3AED', // Vibrant purple
      light: '#9F67FF',
      dark: '#5B21B6',
    },
    secondary: {
      main: '#10B981', // Emerald green
      light: '#34D399',
      dark: '#059669',
    },
    background: {
      default: '#0F172A', // Dark blue-gray
      paper: '#1E293B',
      gradient: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
      cardGradient: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#CBD5E1', // Lightened for better readability
    },
    error: {
      main: '#EF4444',
      light: '#FCA5A5',
    },
    warning: {
      main: '#F59E0B',
      light: '#FCD34D',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
    },
    divider: 'rgba(148, 163, 184, 0.2)', // Increased opacity for better visibility
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.025em',
      color: '#F8FAFC',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.025em',
      color: '#F8FAFC',
    },
    h3: {
      fontWeight: 600,
      letterSpacing: '-0.025em',
      color: '#F8FAFC',
    },
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.025em',
      color: '#F8FAFC',
    },
    h5: {
      fontWeight: 600,
      color: '#F8FAFC',
    },
    h6: {
      fontWeight: 600,
      color: '#F8FAFC',
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 16px',
        },
        contained: {
          backgroundImage: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
          '&:hover': {
            backgroundImage: 'linear-gradient(135deg, #9F67FF 0%, #7C3AED 100%)',
          },
        },
        outlined: {
          borderWidth: 2,
          borderColor: 'rgba(148, 163, 184, 0.3)',
          '&:hover': {
            borderWidth: 2,
            borderColor: 'rgba(148, 163, 184, 0.5)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderWidth: 2,
              borderColor: 'rgba(148, 163, 184, 0.3)',
            },
            '&:hover fieldset': {
              borderWidth: 2,
              borderColor: 'rgba(148, 163, 184, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
        filled: {
          backgroundImage: 'linear-gradient(135deg, rgba(124, 58, 237, 0.3) 0%, rgba(91, 33, 182, 0.3) 100%)',
        },
        outlined: {
          borderWidth: 2,
          borderColor: 'rgba(148, 163, 184, 0.3)',
        },
      },
    },
  },
});

export default theme;
