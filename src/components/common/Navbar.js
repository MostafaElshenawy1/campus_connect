import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Avatar,
  Button,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Favorite,
  ExitToApp,
  Add as AddIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { signOut } from 'firebase/auth';

function Navbar({ user }) {
  const navigate = useNavigate();
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          {/* Logo/Brand - Desktop */}
          <Typography
            variant="h6"
            noWrap
            component="div"
            onClick={() => navigate('/')}
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontWeight: 700,
              background: 'linear-gradient(135deg, #7C3AED 0%, #10B981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            Campus Connect
          </Typography>

          {/* Mobile Menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            {user && (
              <>
                <IconButton
                  size="large"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleOpenNavMenu}
                  color="inherit"
                >
                  <MenuIcon />
                </IconButton>
                <Menu
                  id="menu-appbar"
                  anchorEl={anchorElNav}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  open={Boolean(anchorElNav)}
                  onClose={handleCloseNavMenu}
                  sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiPaper-root': {
                      background: 'rgba(15, 23, 42, 0.9)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(148, 163, 184, 0.1)',
                    },
                  }}
                >
                  <MenuItem onClick={() => { handleCloseNavMenu(); navigate('/create-listing'); }}>
                    <ListItemIcon>
                      <AddIcon fontSize="small" sx={{ color: 'primary.light' }} />
                    </ListItemIcon>
                    <ListItemText>Create Listing</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => { handleCloseNavMenu(); navigate('/my-listings'); }}>
                    <ListItemIcon>
                      <PersonIcon fontSize="small" sx={{ color: 'primary.light' }} />
                    </ListItemIcon>
                    <ListItemText>My Listings</ListItemText>
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>

          {/* Logo/Brand - Mobile */}
          <Typography
            variant="h6"
            noWrap
            component="div"
            onClick={() => navigate('/')}
            sx={{
              flexGrow: 1,
              display: { xs: 'flex', md: 'none' },
              fontWeight: 700,
              background: 'linear-gradient(135deg, #7C3AED 0%, #10B981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            SM
          </Typography>

          {/* Desktop Menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 2 }}>
            {user && (
              <>
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/create-listing')}
                  sx={{
                    color: 'text.primary',
                    '&:hover': {
                      color: 'primary.light',
                    },
                  }}
                >
                  Create Listing
                </Button>
                <Button
                  onClick={() => navigate('/my-listings')}
                  sx={{
                    color: 'text.primary',
                    '&:hover': {
                      color: 'primary.light',
                    },
                  }}
                >
                  My Listings
                </Button>
              </>
            )}
          </Box>

          {/* User Menu */}
          {user ? (
            <Box sx={{ flexShrink: 0 }}>
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar
                  alt={user.displayName || 'User'}
                  src={user.photoURL}
                  sx={{
                    border: '2px solid',
                    borderColor: 'primary.main',
                  }}
                />
              </IconButton>
              <Menu
                sx={{
                  mt: '45px',
                  '& .MuiPaper-root': {
                    background: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                  },
                }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/profile'); }}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" sx={{ color: 'primary.light' }} />
                  </ListItemIcon>
                  <ListItemText>Profile</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { handleCloseUserMenu(); navigate('/liked-listings'); }}>
                  <ListItemIcon>
                    <Favorite fontSize="small" sx={{ color: 'primary.light' }} />
                  </ListItemIcon>
                  <ListItemText>Liked Items</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <ExitToApp fontSize="small" sx={{ color: 'error.main' }} />
                  </ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          ) : null}
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Navbar;
