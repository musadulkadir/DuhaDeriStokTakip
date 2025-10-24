import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  LinearProgress,
  Chip,
  IconButton,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Inventory,
  Category,
  TrendingUp,
  TrendingDown,
  Warning,
  Add,
  MoreVert,
  LocalShipping,
  Assessment,
  People,
  AccountBalanceWallet,
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import { Product, Customer } from '../../main/database/models';

interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  totalCustomers: number;
  totalBalanceTRY: number;
  totalBalanceUSD: number;
  monthlyIncomeTRY: number;
  monthlyIncomeUSD: number;
  monthlyExpenseTRY: number;
  monthlyExpenseUSD: number;
  customerDebt: number;
}

// Güvenli toLocaleString fonksiyonu
const safeToLocaleString = (value: any): string => {
  const num = Number(value) || 0;
  return num.toLocaleString('tr-TR');
};

interface RecentActivity {
  id: string;
  action: string;
  item: string;
  amount: string;
  time: string;
  type: 'in' | 'out' | 'payment' | 'sale';
}

interface LowStockItem {
  id: number;
  name: string;
  current: number;
  min: number;
  percentage: number;
}

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalStock: 0,
    totalCustomers: 0,
    totalBalanceTRY: 0,
    totalBalanceUSD: 0,
    monthlyIncomeTRY: 0,
    monthlyIncomeUSD: 0,
    monthlyExpenseTRY: 0,
    monthlyExpenseUSD: 0,
    customerDebt: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Ürünleri yükle
      const productsResponse = await dbAPI.getProducts();
      const products = productsResponse.success ? productsResponse.data : [];

      // Müşterileri yükle
      const customersResponse = await dbAPI.getCustomers();
      const customers = customersResponse.success ? customersResponse.data : [];

      // Kasa işlemlerini yükle
      const cashResponse = await dbAPI.getCashTransactions();
      const cashTransactions = cashResponse.success ? cashResponse.data : [];

      // İstatistikleri hesapla
      const totalProducts = products.length;
      const totalStock = products.reduce((sum: number, p: Product) => sum + (Number(p.stock_quantity) || 0), 0);
      const totalCustomers = customers.length;

      // Para birimi bazında toplam bakiye hesapla
      const totalBalanceTRY = (cashTransactions || []).reduce((sum: number, t: any) => {
        const currency = t.currency && t.currency.trim() !== '' ? t.currency : 'TRY';
        if (currency === 'TRY') {
          return sum + (t.type === 'in' ? (Number(t.amount) || 0) : -(Number(t.amount) || 0));
        }
        return sum;
      }, 0);

      const totalBalanceUSD = (cashTransactions || []).reduce((sum: number, t: any) => {
        const currency = t.currency && t.currency.trim() !== '' ? t.currency : 'TRY';
        if (currency === 'USD') {
          return sum + (t.type === 'in' ? (Number(t.amount) || 0) : -(Number(t.amount) || 0));
        }
        return sum;
      }, 0);

      // Aylık gelir/gider hesapla
      const currentMonth = new Date().toISOString().substring(0, 7);
      const monthlyTransactions = (cashTransactions || []).filter((t: any) =>
        t.created_at && t.created_at.substring(0, 7) === currentMonth
      );

      const monthlyIncomeTRY = monthlyTransactions
        .filter((t: any) => {
          const currency = t.currency && t.currency.trim() !== '' ? t.currency : 'TRY';
          return t.type === 'in' && currency === 'TRY';
        })
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

      const monthlyIncomeUSD = monthlyTransactions
        .filter((t: any) => {
          const currency = t.currency && t.currency.trim() !== '' ? t.currency : 'TRY';
          return t.type === 'in' && currency === 'USD';
        })
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

      const monthlyExpenseTRY = monthlyTransactions
        .filter((t: any) => {
          const currency = t.currency && t.currency.trim() !== '' ? t.currency : 'TRY';
          return t.type === 'out' && currency === 'TRY';
        })
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

      const monthlyExpenseUSD = monthlyTransactions
        .filter((t: any) => {
          const currency = t.currency && t.currency.trim() !== '' ? t.currency : 'TRY';
          return t.type === 'out' && currency === 'USD';
        })
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

      setStats({
        totalProducts,
        totalStock,
        totalCustomers,
        totalBalanceTRY,
        totalBalanceUSD,
        monthlyIncomeTRY,
        monthlyIncomeUSD,
        monthlyExpenseTRY,
        monthlyExpenseUSD,
        customerDebt: 0,
      });

      // Son aktiviteler
      const activities: RecentActivity[] = (cashTransactions || [])
        .slice(-10)
        .reverse()
        .map((t: any, index: number) => ({
          id: `activity-${index}`,
          action: t.type === 'in' ? 'Gelir' : 'Gider',
          item: t.description || 'İşlem',
          amount: `${t.currency === 'USD' ? '$' : '₺'}${safeToLocaleString(t.amount)}`,
          time: t.created_at || new Date().toISOString(),
          type: t.type,
        }));

      setRecentActivities(activities.slice(0, 5));

      // Düşük stok ürünlerini belirle
      const lowStock = products
        .filter(product => (Number(product.stock_quantity) || 0) < 10)
        .map(product => ({
          id: product.id!,
          name: `${product.category} - ${product.color}`,
          current: Number(product.stock_quantity) || 0,
          min: 10,
          percentage: Math.min(((Number(product.stock_quantity) || 0) / 10) * 100, 100),
        }))
        .slice(0, 5);

      setLowStockItems(lowStock);

    } catch (error) {
      console.error('Dashboard data loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Zaman formatı
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Az önce';
    if (diffInHours < 24) return `${diffInHours} saat önce`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} gün önce`;
    return date.toLocaleDateString('tr-TR');
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const statsCards = [
    {
      title: 'Toplam Ürün',
      value: stats.totalProducts.toString(),
      subtitle: 'farklı ürün',
      icon: <Category />,
      color: '#8D6E63',
      trend: '',
      trendUp: true,
    },
    {
      title: 'Toplam Stok',
      value: safeToLocaleString(stats.totalStock),
      subtitle: 'tane',
      icon: <Inventory />,
      color: '#FF9800',
      trend: '',
      trendUp: true,
    },
    {
      title: 'Kasa Bakiyesi',
      value: `₺${safeToLocaleString(stats.totalBalanceTRY)} / $${safeToLocaleString(stats.totalBalanceUSD)}`,
      subtitle: 'güncel bakiye',
      icon: <AccountBalanceWallet />,
      color: ((stats.totalBalanceTRY || 0) + (stats.totalBalanceUSD || 0)) >= 0 ? '#4CAF50' : '#F44336',
      trend: '',
      trendUp: ((stats.totalBalanceTRY || 0) + (stats.totalBalanceUSD || 0)) >= 0,
    },
    {
      title: 'Müşteri Sayısı',
      value: stats.totalCustomers.toString(),
      subtitle: 'aktif müşteri',
      icon: <People />,
      color: '#2196F3',
      trend: '',
      trendUp: true,
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
          Kontrol Paneli
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
          Dericilik işletmenizin genel durumu
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${card.color}15 0%, ${card.color}25 100%)`,
                border: `1px solid ${card.color}30`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 25px ${card.color}40`,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: card.color,
                      width: 56,
                      height: 56,
                      boxShadow: `0 4px 14px ${card.color}40`,
                    }}
                  >
                    {card.icon}
                  </Avatar>
                  <IconButton size="small" sx={{ color: 'text.secondary' }}>
                    <MoreVert />
                  </IconButton>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  {card.subtitle}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {card.trendUp ? (
                    <TrendingUp sx={{ color: 'success.main', fontSize: 16 }} />
                  ) : (
                    <TrendingUp sx={{ color: 'error.main', fontSize: 16, transform: 'rotate(180deg)' }} />
                  )}
                  <Typography variant="caption" sx={{ color: card.trendUp ? 'success.main' : 'error.main' }}>
                    {card.trend || 'Stabil'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Content Grid */}
      <Grid container spacing={3}>
        {/* Recent Activities */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Son Aktiviteler
                </Typography>
                <IconButton size="small">
                  <MoreVert />
                </IconButton>
              </Box>
              <Box sx={{ space: 2 }}>
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <Box key={activity.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
                        <Avatar
                          sx={{
                            bgcolor: activity.type === 'in' ? 'success.main' : 'error.main',
                            width: 40,
                            height: 40,
                            mr: 2,
                          }}
                        >
                          {activity.type === 'in' ? <TrendingUp /> : <TrendingDown />}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {activity.action}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {activity.item}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {activity.amount}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimeAgo(activity.time)}
                          </Typography>
                        </Box>
                      </Box>
                      {index < recentActivities.length - 1 && <Divider />}
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Henüz aktivite bulunmuyor
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Low Stock Alert */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Düşük Stok Uyarısı
                </Typography>
                <Chip
                  label={lowStockItems.length}
                  color="warning"
                  size="small"
                  icon={<Warning />}
                />
              </Box>
              <Box sx={{ space: 2 }}>
                {lowStockItems.length > 0 ? (
                  lowStockItems.map((item, index) => (
                    <Box key={item.id} sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.current}/{item.min}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={item.percentage}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: item.percentage < 30 ? 'error.main' : item.percentage < 60 ? 'warning.main' : 'success.main',
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Tüm ürünler yeterli stokta
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;