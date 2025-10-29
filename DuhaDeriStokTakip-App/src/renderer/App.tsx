// src/renderer/App.tsx
import { useState, useEffect } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import {
  CssBaseline,
  ThemeProvider,
  createTheme,
  Box,
} from '@mui/material';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProductManagement from './components/ProductManagement';
import CustomerManagement from './components/CustomerManagement';
import CustomerDetail from './components/CustomerDetail';
import SupplierDetail from './components/SupplierDetail';
import EmployeeManagement from './components/EmployeeManagement';
import EmployeeDetail from './components/EmployeeDetail';
import SalesManagement from './components/SalesManagement';
import SupplierManagement from './components/SupplierManagement';
import StockMovements from './components/StockMovements';
import CashManagement from './components/CashManagement';
import Reports from './components/Reports';
import Settings from './components/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import LoginScreen from './components/LoginScreen';
import SplashScreen from './components/SplashScreen';

// Deri temalı açık tasarım
const leatherTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#8D6E63', // Deri kahverengi
      light: '#D7CCC8',
      dark: '#5D4037',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#A1887F', // Açık deri tonu
      light: '#D7CCC8',
      dark: '#6D4C41',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F5F5F5', // Açık gri arka plan
      paper: '#FFFFFF', // Beyaz kartlar
    },

    text: {
      primary: '#3E2723',
      secondary: '#6D4C41',
    },
    success: {
      main: '#4CAF50',
    },
    warning: {
      main: '#FF9800',
    },
    error: {
      main: '#F44336',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    body1: {
      fontSize: '0.95rem',
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #8D6E63 0%, #6D4C41 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #A1887F 0%, #8D6E63 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          background: '#FFFFFF',
          border: '1px solid rgba(141, 110, 99, 0.2)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            border: '1px solid rgba(141, 110, 99, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
          border: '1px solid rgba(141, 110, 99, 0.2)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #3E2723 0%, #2E1A17 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(180deg, #EFEBE9 0%, #D7CCC8 100%)',
          borderRight: '1px solid rgba(141, 110, 99, 0.3)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          margin: '4px 8px',
          '&:hover': {
            backgroundColor: 'rgba(141, 110, 99, 0.2)',
            transform: 'translateX(4px)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(141, 110, 99, 0.3)',
            '&:hover': {
              backgroundColor: 'rgba(141, 110, 99, 0.4)',
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '& fieldset': {
              borderColor: 'rgba(141, 110, 99, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(141, 110, 99, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#8D6E63',
            },
          },
        },
      },
    },
  },
});

export default function App() {
  const [open, setOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Uygulama başlangıcında kısa bir yükleme süresi
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // Şifre koruması kapalıysa otomatik giriş yap
      const passwordEnabled = localStorage.getItem('passwordEnabled');
      if (passwordEnabled === 'false') {
        setIsAuthenticated(true);
      }
    }, 1500); // 1.5 saniye yükleme ekranı

    return () => clearTimeout(timer);
  }, []);

  const toggleSidebar = () => {
    setOpen(!open);
  };

  const handleLogin = () => {
    // Şifre doğru, direkt giriş yap (database zaten yüklü)
    setIsAuthenticated(true);
  };

  // Yükleme ekranı
  if (isLoading) {
    return (
      <ThemeProvider theme={leatherTheme}>
        <CssBaseline />
        <SplashScreen />
      </ThemeProvider>
    );
  }

  // Şifre ekranı (sadece şifre koruması açıksa)
  const passwordEnabled = localStorage.getItem('passwordEnabled') !== 'false';
  if (!isAuthenticated && passwordEnabled) {
    return (
      <ThemeProvider theme={leatherTheme}>
        <CssBaseline />
        <LoginScreen onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={leatherTheme}>
      <CssBaseline />
      <Router>
        <Box
          sx={{
            display: 'flex',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #F5F5F5 0%, #EFEBE9 100%)',
          }}
        >
          <Sidebar open={open} toggleSidebar={toggleSidebar} />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 0,
              ml: '30px',
              width: 'calc(100% - 30px)',
              minHeight: '100vh',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `
                  radial-gradient(circle at 20% 80%, rgba(141, 110, 99, 0.05) 0%, transparent 50%),
                  radial-gradient(circle at 80% 20%, rgba(141, 110, 99, 0.03) 0%, transparent 50%),
                  radial-gradient(circle at 40% 40%, rgba(141, 110, 99, 0.02) 0%, transparent 50%)
                `,
                pointerEvents: 'none',
                zIndex: 0,
              },
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/products" element={<ProductManagement />} />
                  <Route path="/customers" element={<CustomerManagement />} />
                  <Route path="/customers/:id" element={<CustomerDetail />} />
                  <Route path="/suppliers/:id" element={<SupplierDetail />} />
                  <Route path="/employees" element={<EmployeeManagement />} />
                  <Route path="/employees/:id" element={<EmployeeDetail />} />
                  <Route path="/sales" element={<SalesManagement />} />
                  <Route path="/suppliers" element={<SupplierManagement />} />
                  <Route path="/cash" element={<CashManagement />} />
                  <Route path="/movements" element={<StockMovements />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </ErrorBoundary>
            </Box>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}