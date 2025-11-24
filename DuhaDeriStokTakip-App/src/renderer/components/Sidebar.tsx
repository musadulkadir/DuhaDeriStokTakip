// src/renderer/components/Sidebar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  IconButton,
  Divider,
  Typography,
  Box,
  Avatar,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import MenuIcon from '@mui/icons-material/Menu';
import WorkIcon from '@mui/icons-material/Work';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import GroupIcon from '@mui/icons-material/Group';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

const drawerWidth = 280;

interface SidebarProps {
  open: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, toggleSidebar }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Kontrol Paneli', icon: <DashboardIcon /> },
    { path: '/products', label: 'Ürünler', icon: <CategoryIcon /> },
    { path: '/customers', label: 'Müşteri Yönetimi', icon: <ShoppingCartIcon /> },
    { path: '/suppliers', label: 'Tedarikçi Yönetimi', icon: <WorkIcon /> },
    { path: '/employees', label: 'Çalışan Yönetimi', icon: <GroupIcon /> },
    { path: '/cash', label: 'Kasa Yönetimi', icon: <AccountBalanceWalletIcon /> },
    { path: '/checks', label: 'Çek-Senet Kasası', icon: <ReceiptLongIcon /> },
    { path: '/movements', label: 'Stok Hareketleri', icon: <HistoryIcon /> },
    { path: '/reports', label: 'Raporlar', icon: <AssessmentIcon /> },
    { path: '/settings', label: 'Ayarlar', icon: <SettingsIcon /> },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? drawerWidth : 80,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : 80,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #2E1A17 0%, #1A1A1A 100%)',
          color: 'white',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden',
          borderRight: 'none',
          boxShadow: '4px 0 20px rgba(0,0,0,0.3)',
          position: 'fixed',
          height: '100vh',
          zIndex: 1200,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        },
      }}
      open={open}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          px: open ? 3 : 1,
          py: open ? 3 : 2,
          minHeight: open ? '140px' : '80px',
          background: 'linear-gradient(135deg, #D7CCC8 0%, #BCAAA4 100%)',
          borderBottom: '1px solid rgba(141, 110, 99, 0.3)',
          transition: 'all 0.3s ease',
        }}
      >
        {open ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, width: '100%' }}>
            <Box
              component="img"
              src="./Duha-Deri_logo.png"
              alt="Duha Deri Logo"
              sx={{
                width: 80,
                height: 80,
                objectFit: 'contain',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))',
              }}
            />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#3E2723', lineHeight: 1.2 }}>
                Duha Deri
              </Typography>
              <Typography variant="caption" sx={{ color: '#6D4C41', fontSize: '0.8rem' }}>
                Stok & Cari Takip
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box
            component="img"
            src="./Duha-Deri_logo.png"
            alt="Duha Deri Logo"
            sx={{
              width: 50,
              height: 50,
              objectFit: 'contain',
            }}
          />
        )}
        <IconButton
          onClick={toggleSidebar}
          sx={{
            color: '#3E2723',
            position: open ? 'absolute' : 'relative',
            top: open ? 8 : 'auto',
            right: open ? 8 : 'auto',
            '&:hover': {
              backgroundColor: 'rgba(141, 110, 99, 0.2)',
            },
          }}
        >
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'rgba(141, 110, 99, 0.2)' }} />

      {/* Navigation Menu */}
      <List component="nav" sx={{ px: 1, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ display: 'block', mb: 1 }}>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                minHeight: 56,
                justifyContent: open ? 'initial' : 'center',
                px: open ? 3 : 2.5,
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(141, 110, 99, 0.2)',
                  transform: 'translateX(4px)',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(141, 110, 99, 0.3)',
                  borderLeft: '4px solid #8D6E63',
                  '&:hover': {
                    backgroundColor: 'rgba(141, 110, 99, 0.4)',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 3 : 'auto',
                  justifyContent: 'center',
                  color: location.pathname === item.path ? 'primary.main' : 'inherit',
                  transition: 'color 0.3s ease',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                sx={{
                  opacity: open ? 1 : 0,
                  '& .MuiTypography-root': {
                    fontWeight: location.pathname === item.path ? 600 : 400,
                    fontSize: '0.95rem',
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Footer */}
      {open && (
        <Box
          sx={{
            mt: 'auto',
            p: 2,
            borderTop: '1px solid rgba(141, 110, 99, 0.2)',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', display: 'block' }}>
            v1.0.0 - Duha Deri
          </Typography>
        </Box>
      )}
    </Drawer>
  );
};

export default React.memo(Sidebar);