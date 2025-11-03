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
import { formatDate, formatTime, formatDateTime } from '../utils/dateUtils';

interface MovementDisplay extends StockMovement {
  productName?: string;
  productCategory?: string;
  productColor?: string;
  customerName?: string;
  supplierName?: string;
  supplier_id?: number;
  material_id?: number;
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
      // Hem stock_movements hem material_movements'ı yükle
      const [stockResponse, materialResponse] = await Promise.all([
        dbAPI.getStockMovements(),
        dbAPI.getMaterialMovements()
      ]);

      console.log('📊 Stock movements response:', stockResponse);
      console.log('📊 Material movements response:', materialResponse);
      console.log('📦 Available products:', products.length);
      console.log('👥 Available customers:', customers.length);

      const allMovements = [
        ...(stockResponse.success && stockResponse.data ? stockResponse.data : []),
        ...(materialResponse.success && materialResponse.data ? materialResponse.data : [])
      ];

      if (allMovements.length > 0) {
        // Ürün ve müşteri bilgilerini ekleyerek movements'ı zenginleştir
        const enrichedMovements = allMovements.map((movement: any) => {
          // product_id veya material_id'ye göre ürün/malzeme bul
          let product;
          if (movement.material_id) {
            // Malzeme hareketi - material_id ile malzeme ara
            product = products.find((p: any) => p.id === movement.material_id && p.itemType === 'material');
          } else if (movement.product_id) {
            // Ürün hareketi - product_id ile ürün ara
            product = products.find((p: any) => p.id === movement.product_id && p.itemType === 'product');
          }

          const customer = customers.find(c => c.id === movement.customer_id);
          const supplier = customers.find(c => c.id === movement.supplier_id);

          console.log('🔍 Movement:', {
            id: movement.id,
            product_id: movement.product_id,
            material_id: movement.material_id,
            found_product: product ? `${product.category || product.name} - ${product.color || product.color_shade || ''}` : 'NOT FOUND',
            product_details: product,
            notes: movement.notes
          });

          // Notes'tan ürün bilgisini parse et
          // Format: "Satış - Keçi-Palto Bej - 10 adet"
          let parsedProductName = product?.name || product?.category;
          let parsedProductColor = product?.color;

          if (movement.notes && (movement.notes.includes('Satış - ') || movement.notes.includes('Alım - '))) {
            const parts = movement.notes.split(' - ');
            if (parts.length >= 2) {
              const productPart = parts[1].trim(); // "Keçi-Palto Bej"
              const lastSpaceIndex = productPart.lastIndexOf(' ');
              if (lastSpaceIndex > 0) {
                parsedProductName = productPart.substring(0, lastSpaceIndex); // "Keçi-Palto"
                parsedProductColor = productPart.substring(lastSpaceIndex + 1); // "Bej"
              } else {
                parsedProductName = productPart;
              }
            }
          }

          return {
            ...movement,
            product_id: movement.product_id || movement.material_id,
            productName: parsedProductName || 'Bilinmeyen Ürün',
            productCategory: product?.category,
            productColor: parsedProductColor,
            customerName: customer?.name,
            supplierName: supplier?.name,
            supplier_id: movement.supplier_id, // Material movements için
            notes: movement.notes,
            date: formatDate(movement.created_at),
            time: formatTime(movement.created_at),
          };
        });

        // Tarihe göre sırala - en yeni en üstte
        enrichedMovements.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA; // Descending order (en yeni en üstte)
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
      // Hem products hem materials'ı yükle
      const [productsResponse, materialsResponse] = await Promise.all([
        dbAPI.getProducts(),
        dbAPI.getMaterials()
      ]);

      const allProducts = [];
      if (productsResponse.success) {
        // Ürünlere type flag'i ekle
        const productsWithType = productsResponse.data.map((p: any) => ({ ...p, itemType: 'product' }));
        allProducts.push(...productsWithType);
      }
      if (materialsResponse.success && materialsResponse.data) {
        // Malzemelere type flag'i ekle
        const materialsWithType = materialsResponse.data.map((m: any) => ({ ...m, itemType: 'material' }));
        allProducts.push(...materialsWithType);
      }

      setProducts(allProducts);
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
    const product = products.find(p => p.id === movement.product_id);
    const supplier = movement.supplier_id ? customers.find((c: any) => c.id === movement.supplier_id) : null;
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch =
      (movement.productName || '').toLowerCase().includes(searchLower) ||
      (movement.productCategory || '').toLowerCase().includes(searchLower) ||
      (movement.productColor || '').toLowerCase().includes(searchLower) ||
      (movement.notes || '').toLowerCase().includes(searchLower) ||
      (movement.customerName || '').toLowerCase().includes(searchLower) ||
      (supplier?.name || '').toLowerCase().includes(searchLower) ||
      ((product as any)?.brand || '').toLowerCase().includes(searchLower) ||
      ((product as any)?.code || '').toLowerCase().includes(searchLower) ||
      ((product as any)?.color_shade || '').toLowerCase().includes(searchLower);

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

  const totalIn = filteredMovements.filter(m => m.movement_type === 'in').reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
  const totalOut = filteredMovements.filter(m => m.movement_type === 'out').reduce((sum, m) => sum + Math.abs(Number(m.quantity) || 0), 0);
  const netChange = totalIn - totalOut; // Çıkışlar negatif etki yapar

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

      // Stok çıkışında quantity negatif olarak kaydedilmeli (satış işlemiyle tutarlı olması için)
      const savedQuantity = newMovement.type === 'out' ? -quantity : quantity;

      const movementData = {
        product_id: parseInt(newMovement.productId),
        movement_type: newMovement.type,
        quantity: savedQuantity,
        previous_stock: previousStock,
        new_stock: newStock,
        reference_type: 'adjustment',
        notes: newMovement.description || undefined,
        user: 'Sistem Kullanıcısı',
        // created_at gönderilmezse backend CURRENT_TIMESTAMP kullanır (sunucu saati)
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
    <Box sx={{ mr: 2, }}>
      {/* Header */}
      <Box sx={{ mb: 4, mt: 2 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Stok Hareketleri
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Tüm stok giriş ve çıkışlarını takip edin
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
          <Grid container spacing={1} alignItems="center">
            <Grid size={{ xs: 12, md: 3, }}>
              <TextField
                fullWidth
                size="medium"
                placeholder="Ürün adı, kategori, renk, kod, marka veya açıklama ara..."
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
            <Grid size={{ xs: 12, md: 2, }}>
              <FormControl fullWidth size="medium" variant="outlined">
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
            <Grid size={{ xs: 12, md: 2, }}>
              <TextField
                fullWidth
                size="medium"
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
            <Grid size={{ xs: 12, md: 2, }}>
              <TextField
                fullWidth
                size="medium"
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
            <Grid size={{ xs: 12, md: 3, }}>
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
                  <TableCell>Ürün Detayları</TableCell>
                  <TableCell align="center">Miktar</TableCell>
                  <TableCell>Tip</TableCell>
                  <TableCell>Tarih & Saat</TableCell>
                  <TableCell>Açıklama</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedMovements.map((movement) => {
                  // Reports sayfasındaki gibi format: productName - color
                  const productName = movement.productColor
                    ? `${movement.productName || movement.productCategory || 'Ürün'} - ${movement.productColor}`
                    : (movement.productName || movement.productCategory || 'Ürün');

                  console.log('🔄 Stok hareketi formatlanıyor:', {
                    raw_productName: movement.productName,
                    raw_productCategory: movement.productCategory,
                    raw_productColor: movement.productColor,
                    formatted_productName: productName,
                    notes: movement.notes
                  });

                  return (
                    <TableRow key={`${movement.material_id ? 'material' : 'product'}-${movement.id}`} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {productName}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${movement.movement_type === 'out' ? '-' : '+'}${(movement.quantity || 0).toLocaleString('tr-TR')}`}
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
                            {movement.date}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {movement.time || '-'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 250 }}>
                          {(() => {
                            if (!movement.notes) return '-';

                            console.log('📝 Açıklama formatlanıyor:', {
                              notes: movement.notes,
                              supplier_id: movement.supplier_id,
                              customerName: movement.customerName,
                              reference_type: movement.reference_type
                            });

                            // "Satış - Keçi-Palto Bej - 10 adet" -> "Satış - Müşteri Adı"
                            if (movement.notes.includes('Satış - ')) {
                              return movement.customerName ? `Satış - ${movement.customerName}` : 'Satış';
                            }

                            // "Alım - Boya Kahverengi - 100 kg" -> "Alım - Tedarikçi Adı"
                            if (movement.notes.includes('Alım - ')) {
                              const supplier = movement.supplier_id ? customers.find((c: any) => c.id === movement.supplier_id) : null;
                              console.log('🏢 Tedarikçi bulundu:', supplier);
                              return supplier ? `Alım - ${supplier.name}` : 'Alım';
                            }

                            // "İlk stok girişi" veya "Stok ekleme" -> Tedarikçi adını göster
                            if (movement.supplier_id && (movement.notes.includes('İlk stok') || movement.notes.includes('Stok ekleme'))) {
                              const supplier = customers.find((c: any) => c.id === movement.supplier_id);
                              return supplier ? `Alım - ${supplier.name}` : movement.notes;
                            }

                            return movement.notes;
                          })()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
            <Grid size={{ xs: 12, }}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Ürün Seçin</InputLabel>
                <Select
                  value={newMovement.productId}
                  label="Ürün Seçin"
                  onChange={(e) => setNewMovement({ ...newMovement, productId: e.target.value })}
                >
                  <MenuItem value="">Ürün seçin...</MenuItem>
                  {products.map(product => (
                    <MenuItem key={product.id} value={product.id?.toString()}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: getColorDisplay(product.color || ''),
                            border: product.color === 'Beyaz' ? '1px solid #ccc' : 'none',
                          }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2">
                            {product.category} - {product.color}
                            {(product as any).brand && ` (${(product as any).brand})`}
                          </Typography>
                          {(product as any).code && (
                            <Typography variant="caption" color="text.secondary">
                              Kod: {(product as any).code}
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          label={`${(product.stock_quantity || 0).toLocaleString('tr-TR')} ${product.unit || 'adet'}`}
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
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Hareket Tipi</InputLabel>
                <Select
                  value={newMovement.type}
                  label="Hareket Tipi"
                  onChange={(e) => setNewMovement({ ...newMovement, type: e.target.value as 'in' | 'out' })}
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
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Miktar"
                type="text"
                value={newMovement.quantity}
                onChange={(e) => {
                  const formatted = formatNumberWithCommas(e.target.value);
                  setNewMovement({ ...newMovement, quantity: formatted });
                }}
                placeholder="Örn: 1,000"
                helperText="Stok miktarını giriniz"
              />
            </Grid>
            <Grid size={{ xs: 12, }}>
              <TextField
                fullWidth
                label="Açıklama"
                multiline
                rows={3}
                value={newMovement.description}
                onChange={(e) => setNewMovement({ ...newMovement, description: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, }}>
              <TextField
                fullWidth
                label="Referans No (Opsiyonel)"
                value={newMovement.reference}
                onChange={(e) => setNewMovement({ ...newMovement, reference: e.target.value })}
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
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