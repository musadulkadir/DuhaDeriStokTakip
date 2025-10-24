import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Card,
  CardContent,
  Avatar,
  Chip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  ShoppingCart,
  Business,
  TrendingUp,
  TrendingDown,
  AccountBalance,
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import { Customer, Product } from '../../main/database/models';

interface PurchaseItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  material_type?: string; // boya, cila, binder
}

interface NewPurchase {
  supplier_id: string;
  currency: string;
  notes: string;
  items: PurchaseItem[];
}

interface Purchase {
  id: number;
  supplier_id: number;
  supplier_name: string;
  total_amount: number;
  currency: string;
  purchase_date: string;
  notes?: string;
  status: string;
}

const PurchaseManagement: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const [newPurchase, setNewPurchase] = useState<NewPurchase>({
    supplier_id: '',
    currency: 'TRY',
    notes: '',
    items: [],
  });

  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    quantity: '',
    unit_price: '',
  });

  // Tedarikçileri yükle
  const loadSuppliers = async () => {
    try {
      const response = await dbAPI.getCustomers();
      if (response.success) {
        // Sadece tedarikçileri filtrele
        const supplierList = response.data.filter((customer: Customer) => customer.type === 'supplier');
        setSuppliers(supplierList);
      }
    } catch (error) {
      console.error('Tedarikçiler yüklenirken hata:', error);
    }
  };

  // Malzemeleri yükle
  const loadMaterials = async () => {
    try {
      const response = await dbAPI.getProducts();
      if (response.success) {
        // Sadece malzemeleri filtrele (type: 'material' olanlar veya boya/cila/binder kategorisindekiler)
        const materialList = response.data.filter((product: Product) => 
          product.type === 'material' || 
          ['boya', 'cila', 'binder'].includes(product.category?.toLowerCase() || '')
        );
        setMaterials(materialList);
      }
    } catch (error) {
      console.error('Malzemeler yüklenirken hata:', error);
    }
  };

  // Alımları yükle
  const loadPurchases = async () => {
    try {
      const response = await dbAPI.getPurchases();
      if (response.success) {
        const formattedPurchases = response.data.map((purchase: any) => ({
          id: purchase.id,
          supplier_id: purchase.supplier_id,
          supplier_name: purchase.supplier_name || 'Bilinmeyen Tedarikçi',
          total_amount: purchase.total_amount,
          currency: purchase.currency || 'TRY',
          purchase_date: purchase.purchase_date,
          notes: purchase.notes,
          status: purchase.status || 'completed',
        }));
        setPurchases(formattedPurchases);
      }
    } catch (error) {
      console.error('Alımlar yüklenirken hata:', error);
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadMaterials();
    loadPurchases();
  }, []);

  // Sayı formatlama fonksiyonları
  const formatNumberWithCommas = (value: string): string => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const parseFormattedNumber = (value: string): number => {
    return parseInt(value.replace(/,/g, '')) || 0;
  };

  // Ürün ekleme
  const handleAddItem = () => {
    if (!currentItem.product_id || !currentItem.quantity || !currentItem.unit_price) {
      setSnackbar({ open: true, message: 'Lütfen tüm alanları doldurun', severity: 'error' });
      return;
    }

    const quantity = parseFormattedNumber(currentItem.quantity);
    const unitPrice = parseFormattedNumber(currentItem.unit_price);
    const totalPrice = quantity * unitPrice;

    // Seçilen malzemeyi bul
    const selectedMaterial = materials.find(m => m.id === parseInt(currentItem.product_id));
    
    const newItem: PurchaseItem = {
      product_id: parseInt(currentItem.product_id),
      product_name: selectedMaterial?.name || selectedMaterial?.category || 'Bilinmeyen Malzeme',
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      material_type: selectedMaterial?.category,
    };

    setNewPurchase(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }));

    setCurrentItem({
      product_id: '',
      quantity: '',
      unit_price: '',
    });
  };

  // Ürün silme
  const handleRemoveItem = (index: number) => {
    setNewPurchase(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Toplam tutarı hesapla
  const calculateTotal = () => {
    return newPurchase.items.reduce((sum, item) => sum + item.total_price, 0);
  };

  // Alım kaydetme
  const handleSavePurchase = async () => {
    if (!newPurchase.supplier_id || newPurchase.items.length === 0) {
      setSnackbar({ open: true, message: 'Lütfen tedarikçi seçin ve en az bir ürün ekleyin', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const totalAmount = calculateTotal();
      
      // Alım kaydı oluştur
      const purchaseData = {
        supplier_id: parseInt(newPurchase.supplier_id),
        total_amount: totalAmount,
        currency: newPurchase.currency,
        notes: newPurchase.notes,
        items: newPurchase.items,
      };

      const purchaseResponse = await dbAPI.createPurchase(purchaseData);
      if (!purchaseResponse.success) {
        throw new Error(purchaseResponse.error || 'Alım kaydedilemedi');
      }

      // Her ürün için stok artırma ve stok hareketi oluşturma
      for (const item of newPurchase.items) {
        const productId = item.product_id;
        
        // Mevcut stok miktarını al
        const product = materials.find(m => m.id === productId);
        const currentStock = product?.stock_quantity || 0;
        const newStock = currentStock + item.quantity;

        // Ürün stokunu güncelle
        await dbAPI.updateProduct(productId, {
          ...product,
          stock_quantity: newStock,
        });

        // Stok hareketi oluştur
        const movementData = {
          product_id: productId,
          movement_type: 'in' as const,
          quantity: item.quantity,
          previous_stock: currentStock,
          new_stock: newStock,
          reference_type: 'purchase',
          unit_price: item.unit_price,
          total_amount: item.total_price,
          notes: `Tedarikçi alımı - ${suppliers.find(s => s.id === parseInt(newPurchase.supplier_id))?.name}`,
          user: 'Sistem Kullanıcısı',
        };

        await dbAPI.createStockMovement(movementData);
      }

      // Kasadan ödeme düşme
      const cashTransactionData = {
        type: 'out' as const,
        amount: totalAmount,
        currency: newPurchase.currency,
        category: 'purchase',
        description: `Malzeme alımı - ${suppliers.find(s => s.id === parseInt(newPurchase.supplier_id))?.name}`,
        reference_type: 'purchase',
        customer_id: parseInt(newPurchase.supplier_id),
        user: 'Sistem Kullanıcısı',
      };

      await dbAPI.createCashTransaction(cashTransactionData);

      setSnackbar({ open: true, message: 'Alım başarıyla kaydedildi', severity: 'success' });
      setAddDialogOpen(false);
      setNewPurchase({
        supplier_id: '',
        currency: 'TRY',
        notes: '',
        items: [],
      });
      
      // Malzemeleri yeniden yükle
      await loadMaterials();
      await loadPurchases();
    } catch (error) {
      setSnackbar({ open: true, message: 'Alım kaydedilirken hata oluştu', severity: 'error' });
      console.error('Alım kaydetme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺';
    return `${symbol}${amount.toLocaleString('tr-TR')}`;
  };

  const filteredPurchases = purchases.filter(purchase =>
    purchase.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    purchase.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Alım İşlemleri
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Tedarikçilerden malzeme alımlarını yönetin
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <ShoppingCart />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {purchases.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Alım
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                <Business />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {suppliers.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aktif Tedarikçi
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                <TrendingUp />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {materials.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Malzeme Türü
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                <AccountBalance />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  ₺{purchases.reduce((sum, p) => sum + (p.currency === 'TRY' ? p.total_amount : 0), 0).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Alım (TL)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Add */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Tedarikçi adı veya açıklama ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddDialogOpen(true)}
                size="large"
              >
                Yeni Alım Ekle
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Alım Listesi ({filteredPurchases.length} alım)
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Tedarikçi</TableCell>
                  <TableCell align="right">Tutar</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell>Açıklama</TableCell>
                  <TableCell align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {loading ? 'Yükleniyor...' : 'Henüz alım kaydı bulunmuyor'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id} hover>
                      <TableCell>
                        {new Date(purchase.purchase_date).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {purchase.supplier_name}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={formatCurrency(purchase.total_amount, purchase.currency)}
                          color="primary"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={purchase.status === 'completed' ? 'Tamamlandı' : 'Beklemede'}
                          color={purchase.status === 'completed' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{purchase.notes || '-'}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary" title="Düzenle">
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error" title="Sil">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add Purchase Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => setAddDialogOpen(false)} 
        maxWidth="lg" 
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>Yeni Alım Ekle</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Tedarikçi ve Para Birimi */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tedarikçi</InputLabel>
                <Select
                  value={newPurchase.supplier_id}
                  label="Tedarikçi"
                  onChange={(e) => setNewPurchase({ ...newPurchase, supplier_id: e.target.value })}
                >
                  {suppliers.map(supplier => (
                    <MenuItem key={supplier.id} value={supplier.id?.toString()}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Para Birimi</InputLabel>
                <Select
                  value={newPurchase.currency}
                  label="Para Birimi"
                  onChange={(e) => setNewPurchase({ ...newPurchase, currency: e.target.value })}
                >
                  <MenuItem value="TRY">TRY (₺)</MenuItem>
                  <MenuItem value="USD">USD ($)</MenuItem>
                  <MenuItem value="EUR">EUR (€)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Ürün Ekleme */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Malzeme Ekle</Typography>
              </Divider>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Malzeme Türü</InputLabel>
                <Select
                  value={currentItem.product_id}
                  label="Malzeme Türü"
                  onChange={(e) => setCurrentItem({ ...currentItem, product_id: e.target.value })}
                >
                  <MenuItem value="boya">Boya</MenuItem>
                  <MenuItem value="cila">Cila</MenuItem>
                  <MenuItem value="binder">Binder</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Adet"
                value={currentItem.quantity}
                onChange={(e) => setCurrentItem({ ...currentItem, quantity: formatNumberWithCommas(e.target.value) })}
                helperText="Alınan miktar"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Adet Başına Fiyat"
                value={currentItem.unit_price}
                onChange={(e) => setCurrentItem({ ...currentItem, unit_price: formatNumberWithCommas(e.target.value) })}
                helperText="Birim fiyat"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleAddItem}
                sx={{ height: '56px' }}
              >
                Ekle
              </Button>
            </Grid>

            {/* Eklenen Ürünler */}
            {newPurchase.items.length > 0 && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="h6">Eklenen Malzemeler</Typography>
                  </Divider>
                </Grid>
                <Grid item xs={12}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Malzeme</TableCell>
                          <TableCell align="right">Adet</TableCell>
                          <TableCell align="right">Birim Fiyat</TableCell>
                          <TableCell align="right">Toplam</TableCell>
                          <TableCell align="center">İşlem</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {newPurchase.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell align="right">{item.quantity.toLocaleString('tr-TR')}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(item.unit_price, newPurchase.currency)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(item.total_price, newPurchase.currency)}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)}>
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} align="right" sx={{ fontWeight: 600 }}>
                            Genel Toplam:
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {formatCurrency(calculateTotal(), newPurchase.currency)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </>
            )}

            {/* Açıklama */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama (Opsiyonel)"
                multiline
                rows={2}
                value={newPurchase.notes}
                onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
                placeholder="Alım ile ilgili notlar..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>İptal</Button>
          <Button 
            onClick={handleSavePurchase} 
            variant="contained" 
            disabled={loading || newPurchase.items.length === 0}
          >
            {loading ? 'Kaydediliyor...' : `Alımı Kaydet (${formatCurrency(calculateTotal(), newPurchase.currency)})`}
          </Button>
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

export default PurchaseManagement;