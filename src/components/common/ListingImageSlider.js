import React, { useState } from 'react';
import { Box, IconButton, styled } from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

const ImageContainer = styled(Box)(({ height = '200px' }) => ({
  position: 'relative',
  overflow: 'hidden',
  height: height,
  width: '100%',
  borderRadius: '8px',
}));

const ImageSlider = styled(Box)({
  display: 'flex',
  height: '100%',
  width: '100%',
  transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  willChange: 'transform',
});

const Image = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  flexShrink: 0,
});

const NavigationButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  zIndex: 2,
}));

const ImageDots = styled(Box)({
  position: 'absolute',
  bottom: '16px',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: '8px',
  zIndex: 2,
});

const Dot = styled(Box)(({ active }) => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: active ? '#fff' : 'rgba(255, 255, 255, 0.5)',
  transition: 'background-color 0.3s ease',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: '#fff',
  },
}));

function ListingImageSlider({
  images,
  height = '200px',
  showNavigation = true,
  showDots = true,
  onClick = null,
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handlePreviousImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const handleDotClick = (index, e) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  if (!images || images.length === 0) {
    return (
      <ImageContainer height={height}>
        <Image src="/placeholder-image.jpg" alt="No image available" />
      </ImageContainer>
    );
  }

  return (
    <ImageContainer
      height={height}
      onClick={onClick}
      sx={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <ImageSlider
        sx={{
          transform: `translateX(-${currentImageIndex * 100}%)`,
        }}
      >
        {images.map((image, index) => (
          <Box
            key={index}
            sx={{
              minWidth: '100%',
              height: '100%',
              position: 'relative',
            }}
          >
            <Image
              src={image}
              alt={`Image ${index + 1}`}
              loading="lazy"
            />
          </Box>
        ))}
      </ImageSlider>

      {showNavigation && images.length > 1 && (
        <>
          <NavigationButton
            onClick={handlePreviousImage}
            sx={{ left: 8 }}
            size="small"
          >
            <ChevronLeftIcon />
          </NavigationButton>
          <NavigationButton
            onClick={handleNextImage}
            sx={{ right: 8 }}
            size="small"
          >
            <ChevronRightIcon />
          </NavigationButton>
        </>
      )}

      {showDots && images.length > 1 && (
        <ImageDots>
          {images.map((_, index) => (
            <Dot
              key={index}
              active={index === currentImageIndex}
              onClick={(e) => handleDotClick(index, e)}
            />
          ))}
        </ImageDots>
      )}
    </ImageContainer>
  );
}

export default ListingImageSlider;
