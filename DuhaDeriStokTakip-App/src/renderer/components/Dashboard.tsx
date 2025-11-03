import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  LinearProgress,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Inventory,
  TrendingUp,
  TrendingDown,
  Warning,
  People,
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import { Product } from '../../main/database/models';
import { formatDateTime } from '../utils/dateUtils';

interface DashboardStats {
  totalStock: number;
  totalCustomers: number;
}

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
  type: 'in' | 'out';
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
    totalStock: 0,
    totalCustomers: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [productsResponse, customersResponse, cashResponse] = await Promise.all([
        dbAPI.getProducts(),
        dbAPI.getCustomers(),
        dbAPI.getCashTransactions()
      ]);

      const products = productsResponse.success ? productsResponse.data : [];
      const customers = customersResponse.success ? customersResponse.data : [];
      const cashTransactions = cashResponse.success ? cashResponse.data : [];

      const totalStock = products.reduce((sum: number, p: Product) => sum + (Number(p.stock_quantity) || 0), 0);
      const totalCustomers = customers.length;

      setStats({
        totalStock,
        totalCustomers,
      });

      const activities: RecentActivity[] = (cashTransactions || [])
        .slice(-10)
        .reverse()
        .map((t: any, index: number) => ({
          id: `activity-${index}`,
          action: t.type === 'in' ? 'Gelir' : 'Gider',
          item: t.description || 'İşlem',
          amount: `${t.currency === 'USD' ? '$' : '₺'}${safeToLocaleString(t.amount)}`,
          time: formatDateTime(t.created_at),
          type: t.type,
        }));

      setRecentActivities(activities.slice(0, 5));

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
      title: 'Toplam Stok',
      value: safeToLocaleString(stats.totalStock),
      subtitle: 'tane',
      icon: <Inventory />,
      color: '#FF9800',
    },
    {
      title: 'Müşteri Sayısı',
      value: stats.totalCustomers.toString(),
      subtitle: 'aktif müşteri',
      icon: <People />,
      color: '#2196F3',
    },
    {
      title: 'Çalışan Sayısı',
      value: '5',
      subtitle: 'aktif çalışan',
      icon: <People />,
      color: '#4CAF50',
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
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
          Kontrol Paneli
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Dericilik işletmenizin genel durumu
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {statsCards.map((card, index) => (
          <Box key={index} sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Card
              sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${card.color}15 0%, ${card.color}25 100%)`,
                border: `1px solid ${card.color}30`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: `0 4px 12px ${card.color}30`,
                },
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Avatar
                    sx={{
                      bgcolor: card.color,
                      width: 44,
                      height: 44,
                      boxShadow: `0 2px 8px ${card.color}40`,
                    }}
                  >
                    {card.icon}
                  </Avatar>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                  {card.value}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {card.subtitle}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '2 1 500px', minWidth: '300px' }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Son Aktiviteler
                </Typography>
              </Box>
              <Box>
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <Box key={activity.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', py: 1.5 }}>
                        <Avatar
                          sx={{
                            bgcolor: activity.type === 'in' ? 'success.main' : 'error.main',
                            width: 36,
                            height: 36,
                            mr: 1.5,
                          }}
                        >
                          {activity.type === 'in' ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {activity.action}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activity.item}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {activity.amount}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {formatTimeAgo(activity.time)}
                          </Typography>
                        </Box>
                      </Box>
                      {index < recentActivities.length - 1 && <Divider />}
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    Henüz aktivite bulunmuyor
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Düşük Stok Uyarısı
                </Typography>
                <Chip
                  label={lowStockItems.length}
                  color="warning"
                  size="small"
                  icon={<Warning />}
                />
              </Box>
              <Box>
                {lowStockItems.length > 0 ? (
                  lowStockItems.map((item) => (
                    <Box key={item.id} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {item.current}/{item.min}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={item.percentage}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: item.percentage < 30 ? 'error.main' : item.percentage < 60 ? 'warning.main' : 'success.main',
                            borderRadius: 2,
                          },
                        }}
                      />
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    Tüm ürünler yeterli stokta
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
