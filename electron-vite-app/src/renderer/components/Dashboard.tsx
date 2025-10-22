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
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  customerDebt: number;
}

interface RecentActivity {
  id: number;
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
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    customerDebt: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);

  // Verileri yükle
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

      // Stok hareketlerini yükle
      const movementsResponse = await dbAPI.getStockMovements();
      const movements = movementsResponse.success ? movementsResponse.data : [];

      // İstatistikleri hesapla
      const totalStock = products.reduce((sum, product) => sum + (product.stock_quantity || 0), 0);
      const customerDebt = customers.reduce((sum, customer) => sum + Math.abs(Math.min(customer.balance || 0, 0)), 0);

      // Aylık gelir/gider hesapla
      const currentMonth = new Date().toISOString().substring(0, 7);
      const monthlyTransactions = cashTransactions.filter((t: any) => 
        t.created_at && t.created_at.substring(0, 7) === currentMonth
      );
      
      const monthlyIncome = monthlyTransactions
        .filter((t: any) => t.type === 'in')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      
      const monthlyExpense = monthlyTransactions
        .filter((t: any) => t.type === 'out')
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      const totalBalance = cashTransactions.reduce((sum: number, t: any) => {
        return sum + (t.type === 'in' ? (t.amount || 0) : -(t.amount || 0));
      }, 0);

      setStats({
        totalProducts: products.length,
        totalStock,
        totalCustomers: customers.length,
        totalBalance,
        monthlyIncome,
        monthlyExpense,
        customerDebt,
      });

      // Son hareketleri hazırla
      const activities: RecentActivity[] = [];
      
      // Son stok hareketlerini ekle
      movements.slice(0, 3).forEach((movement: any, index: number) => {
        const product = products.find(p => p.id === movement.product_id);
        if (product) {
          activities.push({
            id: `movement-${movement.id}`,
            action: movement.movement_type === 'in' ? 'Stok Girişi' : 'Stok Çıkışı',
            item: `${product.category} - ${product.color}`,
            amount: `${movement.movement_type === 'in' ? '+' : '-'}${movement.quantity} desi`,
            time: formatTimeAgo(movement.created_at),
            type: movement.movement_type === 'in' ? 'in' : 'out',
          });
        }
      });

      // Son kasa işlemlerini ekle
      cashTransactions.slice(0, 2).forEach((transaction: any) => {
        activities.push({
          id: `cash-${transaction.id}`,
          action: transaction.type === 'in' ? 'Gelir' : 'Gider',
          item: transaction.description,
          amount: `${transaction.type === 'in' ? '+' : '-'}$${transaction.amount}`,
          time: formatTimeAgo(transaction.created_at),
          type: transaction.type === 'in' ? 'payment' : 'sale',
        });
      });

      // Zamanına göre sırala
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivities(activities.slice(0, 5));

      // Düşük stok ürünlerini belirle
      const lowStock = products
        .filter(product => (product.stock_quantity || 0) < 10) // 10'dan az olanlar
        .map(product => ({
          id: product.id!,
          name: `${product.category} - ${product.color}`,
          current: product.stock_quantity || 0,
          min: 10,
          percentage: Math.min(((product.stock_quantity || 0) / 10) * 100, 100),
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
      value: stats.totalStock.toString(),
      subtitle: 'adet',
      icon: <Inventory />,
      color: '#FF9800',
      trend: '',
      trendUp: true,
    },
    {
      title: 'Kasa Bakiyesi',
      value: `$${stats.totalBalance.toLocaleString()}`,
      subtitle: 'güncel bakiye',
      icon: <AccountBalanceWallet />,
      color: stats.totalBalance >= 0 ? '#4CAF50' : '#F44336',
      trend: '',
      trendUp: stats.totalBalance >= 0,
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
          Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
          Dericilik işletmenizin genel durumu
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: stat.color,
                      width: 56,
                      height: 56,
                      background: `linear-gradient(135deg, ${stat.color} 0%, ${stat.color}CC 100%)`,
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                  {stat.trend && (
                    <Chip
                      label={stat.trend}
                      size="small"
                      sx={{
                        bgcolor: stat.trendUp ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                        color: stat.trendUp ? '#4CAF50' : '#F44336',
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  {stat.subtitle}
                </Typography>
                <Typography variant="h6" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Additional Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: 'success.main', mb: 1 }}>
                Aylık Gelir
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                ${stats.monthlyIncome.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: 'error.main', mb: 1 }}>
                Aylık Gider
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                ${stats.monthlyExpense.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: 'info.main', mb: 1 }}>
                Net Kar/Zarar
              </Typography>
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  color: (stats.monthlyIncome - stats.monthlyExpense) >= 0 ? 'success.main' : 'error.main'
                }}
              >
                ${(stats.monthlyIncome - stats.monthlyExpense).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: 'warning.main', mb: 1 }}>
                Müşteri Borcu
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                ${stats.customerDebt.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Activities */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Son Hareketler
                </Typography>
                <IconButton>
                  <MoreVert />
                </IconButton>
              </Box>
              <Box>
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <Box key={activity.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            mr: 2,
                            bgcolor: 
                              activity.type === 'in' ? 'rgba(76, 175, 80, 0.1)' :
                              activity.type === 'out' ? 'rgba(244, 67, 54, 0.1)' :
                              activity.type === 'payment' ? 'rgba(33, 150, 243, 0.1)' :
                              'rgba(255, 152, 0, 0.1)',
                            color:
                              activity.type === 'in' ? '#4CAF50' :
                              activity.type === 'out' ? '#F44336' :
                              activity.type === 'payment' ? '#2196F3' :
                              '#FF9800',
                          }}
                        >
                          {activity.type === 'in' ? <Add /> : 
                           activity.type === 'out' ? <LocalShipping /> : 
                           activity.type === 'payment' ? <AccountBalanceWallet /> :
                           <Assessment />}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {activity.action}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {activity.item}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 600,
                              color: activity.type === 'in' || activity.type === 'payment' ? '#4CAF50' : 
                                     activity.type === 'out' ? '#F44336' : 'text.primary'
                            }}
                          >
                            {activity.amount}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {activity.time}
                          </Typography>
                        </Box>
                      </Box>
                      {index < recentActivities.length - 1 && <Divider />}
                    </Box>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      Henüz hareket kaydı bulunmuyor
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Low Stock Alert */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Warning sx={{ color: '#FF9800', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Düşük Stok Uyarısı
                </Typography>
              </Box>
              <Box>
                {lowStockItems.length > 0 ? (
                  lowStockItems.map((item, index) => (
                    <Box key={item.id} sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {item.current}/{item.min}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={item.percentage}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'rgba(255, 152, 0, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: item.percentage < 50 ? '#F44336' : '#FF9800',
                            borderRadius: 4,
                          },
                        }}
                      />
                    </Box>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Tüm ürünler yeterli stokta
                    </Typography>
                  </Box>
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