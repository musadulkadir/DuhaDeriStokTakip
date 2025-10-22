import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Chip,
  Divider,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Delete,
  ShoppingCart,
  Person,
  Receipt,
  Clear,
  CheckCircle,
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import { Product, Customer } from '../../main/database/models';
import { useNavigate } from 'react-router-dom';
import CurrencySelect from './common/CurrencySelect';
import { DEFAULT_CURRENCIES } from '../constants/currencies';

interface SaleItem {
  productId: number;
  productName: string;
  quantityPieces: number; // Adet cinsinden (stoktan düşecek)
  quantityDesi: number; // Desi cinsinden (fiyat hesabı için)
  unitPricePerDesi: number; // Desi başına fiyat
  total: number;
}

interface Sale {
  id: number;
  customerId: number;
  customerName: string;
  items: SaleItem[];
  total: number;
  date: string;
  status: 'Tamamlandı' | 'İptal';
}

const SalesManagement: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // New sale state
  const [newSaleDialogOpen, setNewSaleDialogOpen] = useState(false);
  const [saleDetailDialogOpen, setSaleDetailDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityPieces, setQuantityPieces] = useState<string>('');
  const [quantityDesi, setQuantityDesi] = useState<string>('');
  const [unitPricePerDesi, setUnitPricePerDesi] = useState<string>('');
  const [saleCurrency, setSaleCurrency] = useState(DEFAULT_CURRENCIES.SALES);
  const [errors, setErrors] = useState<string[]>([]);

  // Load data
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
      console.log('Loading customers...');
      const response = await dbAPI.getCustomers();
      console.log('Customers response:', response);
      if (response.success) {
        setCustomers(response.data);
        console.log('Customers loaded:', response.data);
      } else {
        console.error('Failed to load customers:', response.error);
        setSnackbar({ open: true, message: response.error || 'Müşteriler yüklenemedi', severity: 'error' });
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      setSnackbar({ open: true, message: 'Müşteriler yüklenirken hata oluştu', severity: 'error' });
    }
  };

  const loadSales = async () => {
    try {
      const response = await dbAPI.getSales();
      if (response.success) {
        // Satış verilerini grupla ve dönüştür
        const salesMap = new Map();
        
        response.data.forEach((row: any) => {
          if (!salesMap.has(row.id)) {
            salesMap.set(row.id, {
              id: row.id,
              customerId: row.customer_id,
              customerName: row.customer_name,
              total: row.total_amount,
              date: row.sale_date.split('T')[0],
              status: row.payment_status === 'paid' ? 'Tamamlandı' : 'Beklemede',
              items: []
            });
          }
          
          if (row.quantity_pieces) {
            salesMap.get(row.id).items.push({
              productId: row.product_id,
              productName: `${row.category} - ${row.color}`,
              quantityPieces: row.quantity_pieces,
              quantityDesi: row.quantity_desi,
              unitPricePerDesi: row.unit_price_per_desi,
              total: row.total_price
            });
          }
        });
        
        setSales(Array.from(salesMap.values()));
      }
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCustomers();
    loadSales();
  }, []);

  const addItemToSale = () => {
    const newErrors: string[] = [];

    if (!selectedProduct) {
      newErrors.push('Lütfen bir ürün seçin');
    }

    if (!quantityPieces || parseInt(quantityPieces) <= 0) {
      newErrors.push('Geçerli bir adet miktarı girin');
    }

    if (!quantityDesi || parseFloat(quantityDesi) <= 0) {
      newErrors.push('Geçerli bir desi miktarı girin');
    }

    if (!unitPricePerDesi || parseFloat(unitPricePerDesi) <= 0) {
      newErrors.push('Geçerli bir desi başına fiyat girin');
    }

    // Stok kontrolü - stok adet cinsinden
    const piecesToSell = parseInt(quantityPieces);
    const availableStock = selectedProduct?.stock_quantity || 0;
    
    if (selectedProduct && quantityPieces && piecesToSell > availableStock) {
      newErrors.push(`Stok yetersiz! Mevcut stok: ${availableStock} adet`);
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const item: SaleItem = {
      productId: selectedProduct!.id!,
      productName: `${selectedProduct!.category} - ${selectedProduct!.color}`,
      quantityPieces: piecesToSell,
      quantityDesi: parseFloat(quantityDesi),
      unitPricePerDesi: parseFloat(unitPricePerDesi),
      total: parseFloat(quantityDesi) * parseFloat(unitPricePerDesi),
    };

    setSaleItems([...saleItems, item]);
    setSelectedProduct(null);
    setQuantityPieces('');
    setQuantityDesi('');
    setUnitPricePerDesi('');
    setErrors([]);
  };

  const removeItemFromSale = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total, 0);
  };

  const completeSale = async () => {
    if (!selectedCustomer) {
      setErrors(['Lütfen bir müşteri seçin']);
      return;
    }

    if (saleItems.length === 0) {
      setErrors(['Satışa en az bir ürün ekleyin']);
      return;
    }

    setLoading(true);
    try {
      const totalAmount = calculateTotal();
      
      // Satış verisini hazırla
      const saleData = {
        customer_id: selectedCustomer.id,
        total_amount: totalAmount,
        currency: saleCurrency,
        payment_status: 'pending',
        sale_date: new Date().toISOString(),
        notes: `Satış - ${saleItems.length} ürün`,
        items: saleItems.map(item => ({
          product_id: item.productId,
          quantity_pieces: item.quantityPieces,
          quantity_desi: item.quantityDesi,
          unit_price_per_desi: item.unitPricePerDesi,
          total_price: item.total
        }))
      };

      // Satışı veritabanına kaydet
      const saleResponse = await dbAPI.createSale(saleData);
      if (!saleResponse.success) {
        throw new Error(saleResponse.error || 'Satış kaydedilemedi');
      }

      // Satış başarılı - stok güncellemesi sales:create handler'ında yapılıyor

      // Müşteri bakiyesini güncelle (borç ekle)
      const newBalance = (selectedCustomer.balance || 0) - totalAmount;
      await dbAPI.updateCustomerBalance(selectedCustomer.id!, newBalance);

      // Satış yapıldığında kasaya ekleme - KALDIRILDI
      // Müşteri ödeme yaptığında kasaya eklenecek

      // Verileri yeniden yükle
      await loadProducts();
      await loadCustomers();
      await loadSales();
      
      setSnackbar({ open: true, message: 'Satış başarıyla tamamlandı', severity: 'success' });
      
      // Reset form
      setSelectedCustomer(null);
      setSaleItems([]);
      setSaleCurrency(DEFAULT_CURRENCIES.SALES);
      setErrors([]);
      setNewSaleDialogOpen(false);
    } catch (error) {
      console.error('Sale completion error:', error);
      setSnackbar({ 
        open: true, 
        message: error instanceof Error ? error.message : 'Satış tamamlanırken hata oluştu', 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const clearSale = () => {
    setSelectedCustomer(null);
    setSaleItems([]);
    setSelectedProduct(null);
    setQuantityPieces('');
    setQuantityDesi('');
    setUnitPricePerDesi('');
    setErrors([]);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Satış İşlemleri
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Deri satışlarınızı yönetin ve takip edin
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setNewSaleDialogOpen(true)}
            size="large"
          >
            Yeni Satış
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            startIcon={<Receipt />}
            size="large"
            onClick={() => navigate('/reports')}
          >
            Satış Raporu
          </Button>
        </Grid>
      </Grid>

      {/* Sales History */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Satış Geçmişi ({sales.length} satış)
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Satış No</TableCell>
                  <TableCell>Müşteri</TableCell>
                  <TableCell>Ürün Sayısı</TableCell>
                  <TableCell align="right">Toplam Tutar</TableCell>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        #{sale.id}
                      </Typography>
                    </TableCell>
                    <TableCell>{sale.customerName}</TableCell>
                    <TableCell>{sale.items.length} ürün</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ${sale.total.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(sale.date).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sale.status}
                        color={sale.status === 'Tamamlandı' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => {
                          setSelectedSale(sale);
                          setSaleDetailDialogOpen(true);
                        }}
                      >
                        Detay
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* New Sale Dialog */}
      <Dialog 
        open={newSaleDialogOpen} 
        onClose={() => setNewSaleDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingCart />
            Yeni Satış
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Errors */}
          {errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Currency Selection */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Para Birimi
                  </Typography>
                  <CurrencySelect
                    value={saleCurrency}
                    onChange={setSaleCurrency}
                    defaultCurrency={DEFAULT_CURRENCIES.SALES}
                    label="Satış Para Birimi"
                    size="large"
                  />
                </CardContent>
              </Card>
            </Grid>
            
            {/* Customer Selection */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person />
                    Müşteri Seçimi
                  </Typography>
                  <Autocomplete
                    options={customers}
                    getOptionLabel={(option) => `${option.name} - ${option.phone}`}
                    value={selectedCustomer}
                    onChange={(_, newValue) => setSelectedCustomer(newValue)}
                    renderInput={(params) => (
                      <TextField {...params} label="Müşteri Seç" fullWidth />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Box>
                          <Typography variant="body1">{option.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.phone} - Bakiye: ${(option.balance || 0).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  />
                  {selectedCustomer && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="body2">
                        <strong>Seçili Müşteri:</strong> {selectedCustomer.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Güncel Bakiye: ${(selectedCustomer.balance || 0).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Product Addition */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Ürün Ekle
                  </Typography>
                  <Grid container spacing={2} alignItems="end">
                    <Grid item xs={12} md={4}>
                      <Autocomplete
                        options={products}
                        getOptionLabel={(option) => `${option.category} - ${option.color}`}
                        value={selectedProduct}
                        onChange={(_, newValue) => {
                          setSelectedProduct(newValue);
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Ürün Seç" />
                        )}
                        renderOption={(props, option) => (
                          <Box component="li" {...props}>
                            <Box>
                              <Typography variant="body1">
                                {option.category} - {option.color}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Stok: {option.stock_quantity || 0} adet
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        label="Adet"
                        type="number"
                        value={quantityPieces}
                        onChange={(e) => setQuantityPieces(e.target.value)}
                        fullWidth
                        helperText="Stoktan düşecek"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        label="Desi"
                        type="number"
                        value={quantityDesi}
                        onChange={(e) => setQuantityDesi(e.target.value)}
                        fullWidth
                        helperText="Fiyat hesabı için"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        label="Desi Başına Fiyat ($)"
                        type="number"
                        value={unitPricePerDesi}
                        onChange={(e) => setUnitPricePerDesi(e.target.value)}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        label="Toplam ($)"
                        value={quantityDesi && unitPricePerDesi ? (parseFloat(quantityDesi) * parseFloat(unitPricePerDesi)).toFixed(2) : '0'}
                        disabled
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={1}>
                      <Button
                        variant="contained"
                        onClick={addItemToSale}
                        fullWidth
                        startIcon={<Add />}
                      >
                        Ekle
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Sale Items */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Satış Kalemleri ({saleItems.length} ürün)
                  </Typography>
                  {saleItems.length > 0 ? (
                    <>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Ürün</TableCell>
                              <TableCell align="right">Adet</TableCell>
                              <TableCell align="right">Desi</TableCell>
                              <TableCell align="right">Desi Fiyatı</TableCell>
                              <TableCell align="right">Toplam</TableCell>
                              <TableCell align="center">İşlem</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {saleItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.productName}</TableCell>
                                <TableCell align="right">{item.quantityPieces} adet</TableCell>
                                <TableCell align="right">{item.quantityDesi} desi</TableCell>
                                <TableCell align="right">${item.unitPricePerDesi}/desi</TableCell>
                                <TableCell align="right">${item.total.toFixed(2)}</TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => removeItemFromSale(index)}
                                  >
                                    <Delete />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">
                          Genel Toplam: ${calculateTotal().toFixed(2)}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            startIcon={<Clear />}
                            onClick={clearSale}
                          >
                            Temizle
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<CheckCircle />}
                            onClick={completeSale}
                            disabled={loading}
                          >
                            {loading ? 'Tamamlanıyor...' : 'Satışı Tamamla'}
                          </Button>
                        </Box>
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        Henüz ürün eklenmedi
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewSaleDialogOpen(false)}>İptal</Button>
        </DialogActions>
      </Dialog>

      {/* Sale Detail Dialog */}
      <Dialog open={saleDetailDialogOpen} onClose={() => setSaleDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Satış Detayı - #{selectedSale?.id}
        </DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Satış Bilgileri
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Satış No" 
                          secondary={`#${selectedSale.id}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Müşteri" 
                          secondary={selectedSale.customerName}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Tarih" 
                          secondary={new Date(selectedSale.date).toLocaleDateString('tr-TR')}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Durum" 
                          secondary={selectedSale.status}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Toplam Tutar" 
                          secondary={`$${selectedSale.total.toLocaleString()}`}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Satış Kalemleri
                    </Typography>
                    <List dense>
                      {selectedSale.items.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={item.productName}
                            secondary={`${item.quantity} ${item.unit} × $${item.unitPrice} = $${item.total}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaleDetailDialogOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
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

export default SalesManagement;