import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Stack,
  Chip,
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { handleLike, formatLikeCount } from '../../services/likes';
import LocationIcon from '@mui/icons-material/LocationOn';
import ListingImageSlider from './ListingImageSlider';

function ListingCard({
  listing,
  showLikeButton = true,
  showEditButton = false,
  showDeleteButton = false,
  onEdit,
  onDelete,
  isLiked: initialIsLiked,
  onLike,
}) {
  const navigate = useNavigate();
  const [localLikeCount, setLocalLikeCount] = useState(listing.likes || 0);
  const [isLiked, setIsLiked] = useState(initialIsLiked || false);

  useEffect(() => {
    setIsLiked(initialIsLiked || false);
  }, [initialIsLiked]);

  useEffect(() => {
    setLocalLikeCount(listing.likes || 0);
  }, [listing.likes]);

  const handleCardClick = () => {
    navigate(`/listings/${listing.id}`);
  };

  const handleLikeClick = async (e) => {
    e.stopPropagation();
    if (onLike) {
      setLocalLikeCount(prev => prev + (isLiked ? -1 : 1));
      onLike(listing.id);
      return;
    }
    try {
      await handleLike(
        listing.id,
        isLiked,
        (delta) => {
          setLocalLikeCount(prev => prev + delta);
          setIsLiked(!isLiked);
        },
        (error) => {
          console.error('Error liking:', error);
        }
      );
    } catch (error) {
      console.error('Error in like operation:', error);
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(listing);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(listing);
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3,
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out'
        },
      }}
      onClick={handleCardClick}
    >
      <Box sx={{ position: 'relative', width: '100%', height: '200px' }}>
        <ListingImageSlider
          images={listing.images}
          height="200px"
          onClick={handleCardClick}
        />
      </Box>

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          {listing.title}
        </Typography>
        <Typography variant="h5" color="primary" gutterBottom>
          ${listing.price}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          paragraph
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {listing.description}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Chip
            label={listing.category}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={listing.condition}
            size="small"
            color="secondary"
            variant="outlined"
          />
          <Chip
            icon={<LocationIcon />}
            label={listing.location || 'No location'}
            size="small"
            color="info"
            variant="outlined"
          />
        </Stack>
      </CardContent>

      <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {(showEditButton || showDeleteButton) && (
            <>
              {showEditButton && (
                <IconButton
                  onClick={handleEditClick}
                  sx={{
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                    '&:active': {
                      transform: 'scale(0.95)',
                    },
                  }}
                >
                  <EditIcon />
                </IconButton>
              )}
              {showDeleteButton && (
                <IconButton
                  onClick={handleDeleteClick}
                  color="error"
                  sx={{
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    },
                    '&:active': {
                      transform: 'scale(0.95)',
                    },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {formatLikeCount(localLikeCount)}
          </Typography>
          {showLikeButton && (
            <IconButton
              onClick={handleLikeClick}
              color={isLiked ? 'primary' : 'default'}
              sx={{
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.1)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              {isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
          )}
        </Box>
      </Box>
    </Card>
  );
}

export default ListingCard;
