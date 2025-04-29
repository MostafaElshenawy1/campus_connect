import React from 'react';
import { Box, Container, Typography, Link, Grid } from '@mui/material';

function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[200]
            : theme.palette.grey[800],
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              StudentMarket
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The marketplace for students to buy and sell items within their campus community.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Quick Links
            </Typography>
            <Link href="/about" color="inherit" display="block">
              About Us
            </Link>
            <Link href="/contact" color="inherit" display="block">
              Contact
            </Link>
            <Link href="/faq" color="inherit" display="block">
              FAQ
            </Link>
            <Link href="/terms" color="inherit" display="block">
              Terms of Service
            </Link>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Connect With Us
            </Typography>
            <Link href="https://facebook.com" color="inherit" display="block">
              Facebook
            </Link>
            <Link href="https://twitter.com" color="inherit" display="block">
              Twitter
            </Link>
            <Link href="https://instagram.com" color="inherit" display="block">
              Instagram
            </Link>
          </Grid>
        </Grid>
        <Box mt={5}>
          <Typography variant="body2" color="text.secondary" align="center">
            {'© '}
            {new Date().getFullYear()}
            {' StudentMarket. All rights reserved.'}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

export default Footer;
