import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  InputAdornment,
  IconButton,
  Alert,
} from '@mui/material';
import { Visibility, VisibilityOff, Lock } from '@mui/icons-material';

interface LoginScreenProps {
  onLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Şifre localStorage'dan okunuyor
  const RECOVERY_PASSWORD = '6508';
  const getStoredPassword = () => localStorage.getItem('appPassword') || 'admin123';

  const handleLogin = () => {
    const correctPassword = getStoredPassword();
    
    // Normal şifre veya kurtarma şifresi ile giriş
    if (password === correctPassword || password === RECOVERY_PASSWORD) {
      setError('');
      onLogin();
    } else {
      setError('Hatalı şifre! Lütfen tekrar deneyin.');
      setPassword('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #F5F5F5 0%, #EFEBE9 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(141, 110, 99, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(141, 110, 99, 0.08) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
        },
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 5,
          borderRadius: 4,
          maxWidth: 450,
          width: '90%',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(141, 110, 99, 0.2)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8D6E63 0%, #6D4C41 100%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 8px 32px rgba(141, 110, 99, 0.3)',
          }}
        >
          <Typography
            variant="h2"
            sx={{
              color: 'white',
              fontWeight: 700,
              fontFamily: 'serif',
            }}
          >
            D
          </Typography>
        </Box>

        {/* Başlık */}
        <Typography
          variant="h4"
          sx={{
            color: '#3E2723',
            fontWeight: 700,
            mb: 1,
          }}
        >
          Duha Deri Stok Takip
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: '#6D4C41',
            mb: 4,
          }}
        >
          Devam etmek için şifrenizi girin
        </Typography>

        {/* Hata Mesajı */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Şifre Input */}
        <TextField
          fullWidth
          type={showPassword ? 'text' : 'password'}
          label="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          autoFocus
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Lock sx={{ color: '#8D6E63' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        {/* Giriş Butonu */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleLogin}
          sx={{
            py: 1.5,
            borderRadius: 2,
            fontSize: '1.1rem',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #8D6E63 0%, #6D4C41 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #A1887F 0%, #8D6E63 100%)',
            },
          }}
        >
          Giriş Yap
        </Button>

        {/* İpucu */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 3,
            color: '#9E9E9E',
          }}
        >
          Varsayılan şifre: admin123
        </Typography>
      </Paper>
    </Box>
  );
};

export default LoginScreen;
