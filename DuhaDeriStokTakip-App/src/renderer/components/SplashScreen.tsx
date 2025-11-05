import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const SplashScreen: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #F5F5F5 0%, #EFEBE9 100%)',
        zIndex: 9999,
      }}
    >
      <Box
        component="img"
        src="./Duha-Deri_logo.png"
        alt="Duha Deri Logo"
        sx={{
          width: 150,
          height: 150,
          objectFit: 'contain',
          mb: 3,
          filter: 'drop-shadow(0 8px 32px rgba(141, 110, 99, 0.3))',
        }}
      />
      
      <CircularProgress
        size={50}
        thickness={4}
        sx={{
          color: '#8D6E63',
          mb: 2,
        }}
      />
      
      <Typography
        variant="h5"
        sx={{
          color: '#3E2723',
          fontWeight: 600,
          mb: 1,
        }}
      >
        Duha Deri Stok Takip
      </Typography>
      
      <Typography
        variant="body2"
        sx={{
          color: '#6D4C41',
        }}
      >
        Yükleniyor...
      </Typography>
    </Box>
  );
};

export default SplashScreen;
