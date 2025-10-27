import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  MenuItem,
  Button,
  Card,
  CardContent,
  Grid,
  Avatar,
  IconButton,
  InputAdornment,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Add as AddIcon,
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  Download,
  Refresh,
  CalendarToday,
  Person,
  Description,
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import { Product, StockMovement } from '../../main/database/models';

interface MovementDisplay extends StockMovement {
  productName?: string;
  productCategory?: string;
  productColor?: string;
  customerName?: string;
  date?: string;
  time?: string;
}

const StockMovements: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [movements, setMovements] = useState<MovementDisplay[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [newMovement, setNewMovement] = useState({
    productId: '',
    type: 'in' as 'in' | 'out',
    quantity: '',
    description: '',
    reference: '',
  });

  // Sayı formatlama fonksiyonları
  const formatNumberWithCommas = (value: string): string => {
    // Sadece rakam karakterlerini al
    const numericValue = value.replace(/[^\d]/g, '');
    
    // Eğer boşsa boş döndür
    if (!numericValue) return '';
    
    // Üç haneli ayraçlarla formatla
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const parseFormattedNumber = (value: string): number => {
    // Virgülleri kaldır ve sayıya çevir
    return parseInt(value.replace(/,/g, '')) || 0;
  };

  // Load data
  const loadMovements = async () => {
    setLoading(true);
    try {
      const response = await dbAPI.getStockMovements();
      if (response.success) {
        // Ürün ve müşteri bilgilerini ekleyerek movements'ı zenginleştir
        const enrichedMovements = response.data.map((movement: StockMovement) => {
          const product = products.find(p => p.id === movement.product_id);
          const customer = customers.find(c => c.id === movement.customer_id);
          
          let description = movement.notes || '';
          if (movement.reference_type === 'sale' && customer) {
            description = `Satış - ${customer.name}`;
          } else if (movement.reference_type === 'sale' && !customer) {
            description = 'Satış - Müşteri bilgisi bulunamadı';
          }
          
          return {
            ...movement,
            productName: product ? `${product.category} - ${product.color}` : 'Bilinmeyen Ürün',
            productCategory: product?.category,
            productColor: product?.color,
            customerName: customer?.name,
            notes: description,
            date: movement.created_at ? new Date(movement.created_at).toISOString().split('T')[0] : '',
            time: movement.created_at ? new Date(movement.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '',
          };
        });
        setMovements(enrichedMovements);
      }
    } catch (error) {
      console.error('Error loading movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await dbAPI.getProducts();
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await dbAPI.getCustomers();
      if (response.success) {
        setCustomers(response.data);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const getColorDisplay = (color: string) => {
    const colorMap: { [key: string]: string } = {
      'Siyah': '#000000',
      'Kahverengi': '#8B4513',
      'Beyaz': '#FFFFFF',
      'Taba': '#D2B48C',
      'Krem': '#F5F5DC',
      'Bordo': '#800020',
      'Lacivert': '#000080',
      'Gri': '#808080',
      'Kırmızı': '#FF0000',
      'Yeşil': '#008000'
    };
    return colorMap[color] || '#F5F5DC';
  };

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  useEffect(() => {
    if (products.length > 0 && customers.length > 0) {
      loadMovements();
    }
  }, [products, customers]);

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = (movement.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (movement.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (movement.user || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === '' || movement.movement_type === filterType;
    const matchesDateRange = (!startDate || (movement.date && movement.date >= startDate)) && 
                            (!endDate || (movement.date && movement.date <= endDate));
    
    return matchesSearch && matchesType && matchesDateRange;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredMovements.length / itemsPerPage);
  const paginatedMovements = filteredMovements.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in': return <TrendingUp />;
      case 'out': return <TrendingDown />;
      case 'adjustment': return <Refresh />;
      default: return <SwapHoriz />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'in': return '#4CAF50';
      case 'out': return '#F44336';
      case 'adjustment': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'in': return 'Giriş';
      case 'out': return 'Çıkış';
      case 'adjustment': return 'Düzeltme';
      default: return 'Bilinmeyen';
    }
  };

  const totalIn = filteredMovements.filter(m => m.movement_type === 'in').reduce((sum, m) => sum + (m.quantity || 0), 0);
  const totalOut = filteredMovements.filter(m => m.movement_type === 'out').reduce((sum, m) => sum + (m.quantity || 0), 0);
  const netChange = totalIn - totalOut;

  const handleAddMovement = async () => {
    if (!newMovement.productId || !newMovement.quantity) {
      setSnackbar({ open: true, message: 'Lütfen tüm gerekli alanları doldurun', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const product = products.find(p => p.id === parseInt(newMovement.productId));
      if (!product) {
        setSnackbar({ open: true, message: 'Ürün bulunamadı', severity: 'error' });
        return;
      }

      const quantity = parseFormattedNumber(newMovement.quantity);
      const previousStock = product.stock_quantity || 0;
      const newStock = newMovement.type === 'in' ? previousStock + quantity : previousStock - quantity;

      if (newMovement.type === 'out' && newStock < 0) {
        setSnackbar({ open: true, message: 'Stok yetersiz!', severity: 'error' });
        return;
      }

      const movementData = {
        product_id: parseInt(newMovement.productId),
        movement_type: newMovement.type,
        quantity: quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        reference_type: 'adjustment',
        notes: newMovement.description || null,
        user: 'Sistem Kullanıcısı',
      };

      const response = await dbAPI.createStockMovement(movementData);
      if (response.success) {
        // Ürün stokunu güncelle
        await dbAPI.updateProductStock(parseInt(newMovement.productId), newStock);
        
        setSnackbar({ open: true, message: 'Stok hareketi başarıyla eklendi', severity: 'success' });
        setAddDialogOpen(false);
        setNewMovement({
          productId: '',
          type: 'in',
          quantity: '',
          description: '',
          reference: '',
        });
        
        // Verileri yeniden yükle
        await loadProducts();
        await loadMovements();
      } else {
        setSnackbar({ open: true, message: response.error || 'Stok hareketi eklenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Stok hareketi eklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Stok Hareketleri
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Tüm stok giriş ve çıkışlarını takip edin
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: '#4CAF50', mr: 2 }}>
                <TrendingUp />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#4CAF50' }}>
                  +{totalIn.toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Giriş
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: '#F44336', mr: 2 }}>
                <TrendingDown />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#F44336' }}>
                  -{totalOut.toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Çıkış
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: netChange >= 0 ? '#4CAF50' : '#F44336', mr: 2 }}>
                {netChange >= 0 ? <TrendingUp /> : <TrendingDown />}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: netChange >= 0 ? '#4CAF50' : '#F44336' }}>
                  {netChange >= 0 ? '+' : ''}{netChange.toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Net Değişim
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <SwapHoriz />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {movements.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Hareket
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Filtreleme ve Arama
          </Typography>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="large"
                placeholder="Ürün, açıklama veya kullanıcı ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    minHeight: '56px',
                    fontSize: '1.1rem',
                  },
                  '& .MuiOutlinedInput-input': {
                    fontSize: '1.1rem',
                    fontWeight: 500,
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="large" variant="outlined">
                <InputLabel 
                  id="movement-type-filter-label"
                  sx={{ 
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  }}
                >
                  Hareket Tipi
                </InputLabel>
                <Select
                  labelId="movement-type-filter-label"
                  value={filterType}
                  label="Hareket Tipi"
                  onChange={(e) => setFilterType(e.target.value)}
                  sx={{ 
                    minHeight: '56px',
                    '& .MuiSelect-select': {
                      fontSize: '1.1rem',
                      fontWeight: 500,
                    }
                  }}
                >
                  <MenuItem value="">Tüm Hareketler</MenuItem>
                  <MenuItem value="in">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUp sx={{ color: 'success.main', fontSize: 20 }} />
                      Giriş
                    </Box>
                  </MenuItem>
                  <MenuItem value="out">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingDown sx={{ color: 'error.main', fontSize: 20 }} />
                      Çıkış
                    </Box>
                  </MenuItem>
                  <MenuItem value="adjustment">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SwapHoriz sx={{ color: 'warning.main', fontSize: 20 }} />
                      Düzeltme
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="large"
                label="Başlangıç Tarihi"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    minHeight: '56px',
                    fontSize: '1.1rem',
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  },
                  '& .MuiOutlinedInput-input': {
                    fontSize: '1.1rem',
                    fontWeight: 500,
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                size="large"
                label="Bitiş Tarihi"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    minHeight: '56px',
                    fontSize: '1.1rem',
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '1.1rem',
                    fontWeight: 600,
                  },
                  '& .MuiOutlinedInput-input': {
                    fontSize: '1.1rem',
                    fontWeight: 500,
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{ minHeight: '56px' }}
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('');
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  Temizle
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{ minHeight: '56px' }}
                  startIcon={<Download />}
                >
                  Dışa Aktar
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Stok Hareketleri ({filteredMovements.length} kayıt)
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Hareket</TableCell>
                  <TableCell>Ürün</TableCell>
                  <TableCell align="center">Miktar</TableCell>
                  <TableCell>Tip</TableCell>
                  <TableCell>Tarih & Saat</TableCell>
                  <TableCell>Kullanıcı</TableCell>
                  <TableCell>Açıklama</TableCell>
                  <TableCell>Referans</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedMovements.map((movement) => (
                  <TableRow key={movement.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: getMovementColor(movement.movement_type || ''),
                          }}
                        >
                          {getMovementIcon(movement.movement_type || '')}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          #{movement.id}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {movement.productName}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={movement.movement_type === 'out' ? `-${(movement.quantity || 0).toLocaleString('tr-TR')}` : `+${(movement.quantity || 0).toLocaleString('tr-TR')}`}
                        color={movement.movement_type === 'out' ? 'error' : 'success'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getMovementTypeLabel(movement.movement_type || '')}
                        size="small"
                        sx={{
                          bgcolor: getMovementColor(movement.movement_type || ''),
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {movement.date ? new Date(movement.date).toLocaleDateString('tr-TR') : '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {movement.time || '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {movement.user || 'Sistem'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 200 }}>
                        {movement.notes || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {movement.reference_type && (
                        <Chip
                          label={movement.reference_type}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'linear-gradient(135deg, #8D6E63 0%, #6D4C41 100%)',
        }}
        onClick={() => setAddDialogOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Add Movement Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Stok Hareketi Ekle</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Ürün Seçin</InputLabel>
                <Select
                  value={newMovement.productId}
                  label="Ürün Seçin"
                  onChange={(e) => setNewMovement({...newMovement, productId: e.target.value})}
                >
                  <MenuItem value="">Ürün seçin...</MenuItem>
                  {products.map(product => (
                    <MenuItem key={product.id} value={product.id?.toString()}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: getColorDisplay(product.color || ''),
                            border: product.color === 'Beyaz' ? '1px solid #ccc' : 'none',
                          }}
                        />
                        {product.category} - {product.color} 
                        <Chip 
                          label={`${(product.stock_quantity || 0).toLocaleString('tr-TR')} adet`} 
                          size="small" 
                          variant="outlined"
                          sx={{ ml: 'auto' }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Hareket Tipi</InputLabel>
                <Select
                  value={newMovement.type}
                  label="Hareket Tipi"
                  onChange={(e) => setNewMovement({...newMovement, type: e.target.value as 'in' | 'out'})}
                >
                  <MenuItem value="">Tip seçin...</MenuItem>
                  <MenuItem value="in">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUp sx={{ color: 'success.main', fontSize: 20 }} />
                      Stok Girişi
                    </Box>
                  </MenuItem>
                  <MenuItem value="out">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingDown sx={{ color: 'error.main', fontSize: 20 }} />
                      Stok Çıkışı
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Miktar"
                type="number"
                value={newMovement.quantity}
                onChange={(e) => {
                  const formatted = formatNumberWithCommas(e.target.value);
                  setNewMovement({...newMovement, quantity: formatted});
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama"
                multiline
                rows={3}
                value={newMovement.description}
                onChange={(e) => setNewMovement({...newMovement, description: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Referans No (Opsiyonel)"
                value={newMovement.reference}
                onChange={(e) => setNewMovement({...newMovement, reference: e.target.value})}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>İptal</Button>
          <Button onClick={handleAddMovement} variant="contained" disabled={loading}>
            {loading ? 'Ekleniyor...' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        sx={{ zIndex: 9999 }}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StockMovements;