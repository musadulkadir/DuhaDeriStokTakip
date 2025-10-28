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
  Paper,
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
  History as HistoryIcon,
} from '@mui/icons-material';
import Pagination from './common/Pagination';
import { dbAPI } from '../services/api';
import { Customer, Product } from '../../main/database/models';
import PurchaseDetailModal from './PurchaseDetailModal';

interface PurchaseItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  material_type?: string; // boya, cila, binder
  brand?: string; // firma
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
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [newPurchase, setNewPurchase] = useState<NewPurchase>({
    supplier_id: '',
    currency: 'TRY',
    notes: '',
    items: [],
  });

  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    category: '',
    quantity: '',
    unit_price: '',
    color_shade: '',
    brand: '',
    code: '',
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
      const response = await dbAPI.getMaterials();
      if (response.success && response.data) {
        setMaterials(response.data);
      }
    } catch (error) {
      console.error('Malzemeler yüklenirken hata:', error);
    }
  };

  // Alımları yükle
  const loadPurchases = async (page = 1) => {
    try {
      setLoading(true);
      const response = await dbAPI.getPurchases(page, itemsPerPage);
      console.log('Alım verileri:', response.data);
      if (response.success) {
        const formattedPurchases = response.data.map((purchase: any) => ({
          id: purchase.id,
          supplier_id: purchase.supplier_id,
          supplier_name: purchase.supplier_name || 'Bilinmeyen Tedarikçi',
          total_amount: parseFloat(purchase.total_amount) || 0,
          currency: purchase.currency || 'TRY',
          purchase_date: purchase.purchase_date,
          notes: purchase.notes,
          status: purchase.status || 'completed',
        }));
        console.log('Formatlanmış alımlar:', formattedPurchases);
        setPurchases(formattedPurchases);

        // Toplam sayfa sayısını hesapla
        const total = response.total || formattedPurchases.length;
        setTotalItems(total);
        setTotalPages(Math.ceil(total / itemsPerPage));
      }
    } catch (error) {
      console.error('Alımlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadMaterials();
  }, []);

  useEffect(() => {
    loadPurchases(currentPage);
  }, [currentPage, itemsPerPage]);

  // Sayı formatlama fonksiyonları
  // Miktar için (tam sayı)
  const formatNumberWithCommas = (value: string): string => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const parseFormattedNumber = (value: string): number => {
    return parseInt(value.replace(/,/g, '')) || 0;
  };

  // Birim fiyat için (ondalıklı sayı)
  const formatDecimalNumber = (value: string): string => {
    // Sadece rakam ve nokta karakterlerini al
    const numericValue = value.replace(/[^\d.]/g, '');

    // Birden fazla nokta varsa sadece ilkini tut
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }

    return numericValue;
  };

  const parseDecimalNumber = (value: string): number => {
    return parseFloat(value.replace(/,/g, '')) || 0;
  };

  // Ürün ekleme
  const handleAddItem = async () => {
    const quantity = parseFormattedNumber(currentItem.quantity);
    const unitPrice = parseDecimalNumber(currentItem.unit_price);

    if (!currentItem.category || quantity <= 0 || unitPrice <= 0) {
      setSnackbar({ open: true, message: 'Lütfen kategori, miktar ve fiyat alanlarını doldurun', severity: 'error' });
      return;
    }

    // Kategori bazında zorunlu alan kontrolü
    if (currentItem.category === 'Boya' && !currentItem.color_shade) {
      setSnackbar({ open: true, message: 'Boya için renk tonu gerekli', severity: 'error' });
      return;
    }
    if (currentItem.category === 'Cila' && !currentItem.brand) {
      setSnackbar({ open: true, message: 'Cila için firma gerekli', severity: 'error' });
      return;
    }
    if (currentItem.category === 'Binder' && (!currentItem.code || !currentItem.brand)) {
      setSnackbar({ open: true, message: 'Binder için kod ve firma gerekli', severity: 'error' });
      return;
    }

    try {
      setLoading(true);

      // Malzeme adını oluştur
      const materialName = `${currentItem.category}${currentItem.color_shade ? ` - ${currentItem.color_shade}` : ''}${currentItem.code ? ` - ${currentItem.code}` : ''}`;

      // Önce aynı malzeme var mı kontrol et
      let existingMaterial = materials.find(m => {
        if (currentItem.category === 'Boya') {
          return m.category === currentItem.category && m.color_shade === currentItem.color_shade;
        } else if (currentItem.category === 'Cila') {
          return m.category === currentItem.category && m.brand === currentItem.brand;
        } else if (currentItem.category === 'Binder') {
          return m.category === currentItem.category && m.code === currentItem.code && m.brand === currentItem.brand;
        }
        return false;
      });

      let materialId: number;
      let materialBrand: string | undefined;

      if (existingMaterial) {
        // Mevcut malzemeyi kullan
        materialId = existingMaterial.id!;
        materialBrand = existingMaterial.brand || undefined;
        setSnackbar({ open: true, message: 'Mevcut malzeme kullanıldı', severity: 'info' });
      } else {
        // Yeni malzeme oluştur
        const brandValue = currentItem.brand?.trim() || undefined;
        const materialData = {
          name: materialName,
          category: currentItem.category,
          color_shade: currentItem.color_shade || undefined,
          brand: brandValue,
          code: currentItem.code || undefined,
          stock_quantity: 0,
          unit: 'kg',
          description: `${currentItem.category} malzemesi`
        };

        const materialResponse = await dbAPI.createMaterial(materialData);
        if (!materialResponse.success || !materialResponse.data) {
          throw new Error('Malzeme oluşturulamadı');
        }

        materialId = materialResponse.data.id || 0;
        materialBrand = brandValue;
        setSnackbar({ open: true, message: 'Yeni malzeme oluşturuldu', severity: 'success' });

        // Malzeme listesini yenile
        await loadMaterials();
      }

      const newItem: PurchaseItem = {
        product_id: materialId,
        product_name: materialName,
        quantity,
        unit_price: unitPrice,
        total_price: quantity * unitPrice,
        brand: materialBrand,
      };

      setNewPurchase(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));

      // Formu temizle
      setCurrentItem({
        product_id: '',
        category: '',
        quantity: '',
        unit_price: '',
        color_shade: '',
        brand: '',
        code: '',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      setSnackbar({ open: true, message: 'Malzeme eklenirken hata oluştu: ' + errorMessage, severity: 'error' });
    } finally {
      setLoading(false);
    }
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
      // Önce tedarikçi kontrolü yap
      const supplierId = parseInt(newPurchase.supplier_id);
      if (isNaN(supplierId) || !supplierId) {
        throw new Error('Lütfen geçerli bir tedarikçi seçiniz');
      }

      const totalAmount = calculateTotal();

      // Alım kaydı oluştur
      const purchaseData = {
        supplier_id: supplierId,
        total_amount: totalAmount,
        currency: newPurchase.currency,
        notes: newPurchase.notes,
        items: newPurchase.items,
      };

      console.log('Sending purchase data:', JSON.stringify(purchaseData, null, 2));

      const purchaseResponse = await dbAPI.createPurchase(purchaseData);
      if (!purchaseResponse.success) {
        throw new Error(purchaseResponse.error || 'Alım kaydedilemedi');
      }

      // Tedarikçi adını bul
      const supplierName = suppliers.find(s => s.id === supplierId)?.name || 'Bilinmeyen Tedarikçi';

      // Stok güncelleme ve stok hareketi backend'de yapılıyor (purchases:create handler'ında)

      // Kasadan ödeme düşme
      const cashTransactionData = {
        type: 'out' as const,
        amount: totalAmount,
        currency: newPurchase.currency,
        category: 'purchase',
        description: `Malzeme alımı - ${supplierName}`,
        reference_type: 'purchase',
        customer_id: supplierId,
        user: 'Sistem Kullanıcısı',
      };

      await dbAPI.createCashTransaction(cashTransactionData);

      // Tedarikçi hesabına borç ekleme (alım tutarı kadar borç)
      const supplier = suppliers.find(s => s.id === supplierId);
      if (supplier) {
        // Tedarikçi bakiyesini güncelle (borç = pozitif değer) - Para birimine göre
        const currency = newPurchase.currency || 'TRY';
        const updateData: any = {};

        // Mevcut bakiyeleri al
        const currentBalanceTRY = Number(supplier.balance) || 0;
        const currentBalanceUSD = Number(supplier.balance_usd) || 0;
        const currentBalanceEUR = Number(supplier.balance_eur) || 0;

        if (currency === 'USD') {
          updateData.balance_usd = currentBalanceUSD + totalAmount;
        } else if (currency === 'EUR') {
          updateData.balance_eur = currentBalanceEUR + totalAmount;
        } else {
          updateData.balance = currentBalanceTRY + totalAmount;
        }

        console.log('Tedarikçi bakiyesi güncelleniyor:', {
          supplierId,
          currency,
          totalAmount,
          currentBalance: currency === 'USD' ? currentBalanceUSD : currency === 'EUR' ? currentBalanceEUR : currentBalanceTRY,
          newBalance: updateData.balance || updateData.balance_usd || updateData.balance_eur
        });

        await dbAPI.updateCustomer(supplierId, updateData);
      }

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
      await loadPurchases(1); // İlk sayfaya dön
      setCurrentPage(1); // Sayfa numarasını sıfırla
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
              <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                <AccountBalance />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  ₺{purchases.filter(p => p.currency === 'TRY').reduce((sum, p) => sum + p.total_amount, 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Alım (TL)
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
                  ${purchases.filter(p => p.currency === 'USD').reduce((sum, p) => sum + p.total_amount, 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Alım (USD)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                <TrendingDown />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  €{purchases.filter(p => p.currency === 'EUR').reduce((sum, p) => sum + p.total_amount, 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Alım (EUR)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
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
              <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
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
                        <IconButton
                          size="small"
                          color="info"
                          title="Detaylar"
                          onClick={() => {
                            setSelectedPurchaseId(purchase.id);
                            setDetailDialogOpen(true);
                          }}
                        >
                          <HistoryIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          title="Sil"
                          onClick={async () => {
                            console.log('Sil butonu tıklandı:', purchase);
                            if (window.confirm('Bu alım kaydını silmek istediğinizden emin misiniz?')) {
                              setLoading(true);
                              try {
                                const response = await dbAPI.deletePurchase(purchase.id);
                                if (response.success) {
                                  setSnackbar({ open: true, message: 'Alım kaydı başarıyla silindi', severity: 'success' });
                                  await loadPurchases(currentPage);
                                } else {
                                  setSnackbar({ open: true, message: response.error || 'Alım kaydı silinemedi', severity: 'error' });
                                }
                              } catch (error) {
                                setSnackbar({ open: true, message: 'Alım kaydı silinirken hata oluştu', severity: 'error' });
                              } finally {
                                setLoading(false);
                              }
                            }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box sx={{ px: 3, pb: 2 }}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
            />
          </Box>
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

            <Grid size={{ xs: 6, md: 3 }} >
              <FormControl fullWidth size="medium">
                <InputLabel sx={{ fontSize: '1.1rem' }}>Tedarikçi</InputLabel>
                <Select
                  value={newPurchase.supplier_id}
                  label="Tedarikçi"
                  onChange={(e) => setNewPurchase({ ...newPurchase, supplier_id: e.target.value })}
                  sx={{
                    '& .MuiSelect-select': {
                      fontSize: '1rem',
                      py: 2
                    }
                  }}
                >
                  {suppliers.map(supplier => (
                    <MenuItem
                      key={supplier.id}
                      value={supplier.id?.toString()}
                      sx={{ fontSize: '1rem', py: 1.5 }}
                    >
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <FormControl fullWidth size="medium">
                <InputLabel sx={{ fontSize: '1rem' }}>Para Birimi</InputLabel>
                <Select
                  value={newPurchase.currency}
                  label="Para Birimi"
                  onChange={(e) => setNewPurchase({ ...newPurchase, currency: e.target.value })}
                  sx={{
                    '& .MuiSelect-select': {
                      fontSize: '1rem',
                      py: 2
                    }
                  }}
                >
                  <MenuItem value="TRY" sx={{ fontSize: '1rem', py: 1.5 }}>TRY (₺)</MenuItem>
                  <MenuItem value="USD" sx={{ fontSize: '1rem', py: 1.5 }}>USD ($)</MenuItem>
                  <MenuItem value="EUR" sx={{ fontSize: '1rem', py: 1.5 }}>EUR (€)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {/* Açıklama */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Açıklama (Opsiyonel)"
                multiline
                rows={1}
                value={newPurchase.notes}
                onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
                placeholder="Alım ile ilgili notlar..."
              />
            </Grid>

            {/* Malzeme Ekleme */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Malzeme Ekle</Typography>
              </Divider>
            </Grid>

            {/* Kategori Seçimi */}
            <Grid size={{ xs: 12, md: 2 }}>
              <FormControl fullWidth size="medium">
                <InputLabel sx={{ fontSize: '1rem' }} size='medium'>Kategori</InputLabel>
                <Select
                  value={currentItem.category}
                  label="Kategori"
                  onChange={(e) => setCurrentItem({
                    ...currentItem,
                    category: e.target.value,
                    color_shade: '',
                    brand: '',
                    code: ''
                  })}
                  sx={{
                    '& .MuiSelect-select': {
                      fontSize: '1rem',
                      py: 2
                    }
                  }}
                >
                  <MenuItem value="Boya" sx={{ fontSize: '1rem', py: 1.5 }}>Boya</MenuItem>
                  <MenuItem value="Cila" sx={{ fontSize: '1rem', py: 1.5 }}>Cila</MenuItem>
                  <MenuItem value="Binder" sx={{ fontSize: '1rem', py: 1.5 }}>Binder</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Boya için Renk Tonu */}
            {currentItem.category === 'Boya' && (
              <Grid size={{ xs: 6, md: 2 }}>
                <TextField
                  fullWidth
                  label="Renk Tonu"
                  value={currentItem.color_shade}
                  onChange={(e) => setCurrentItem({ ...currentItem, color_shade: e.target.value })}
                  placeholder="Örn: Açık Kahverengi"
                  InputProps={{
                    sx: { fontSize: '1rem', minHeight: '60px' }
                  }}
                  InputLabelProps={{
                    sx: { fontSize: '1rem' }
                  }}
                />
              </Grid>
            )}

            {/* Cila için Firma */}
            {currentItem.category === 'Cila' && (
              <Grid size={{ xs: 6, md: 2 }}>
                <TextField
                  fullWidth
                  label="Firma"
                  value={currentItem.brand}
                  onChange={(e) => setCurrentItem({ ...currentItem, brand: e.target.value })}
                  placeholder="Örn: Sayerlack"
                  InputProps={{
                    sx: { fontSize: '1rem', minHeight: '60px' }
                  }}
                  InputLabelProps={{
                    sx: { fontSize: '1rem' }
                  }}
                />
              </Grid>
            )}

            {/* Binder için Kod ve Firma */}
            {currentItem.category === 'Binder' && (
              <>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField
                    fullWidth
                    label="Kod"
                    value={currentItem.code}
                    onChange={(e) => setCurrentItem({ ...currentItem, code: e.target.value })}
                    placeholder="Örn: B-100"
                    InputProps={{
                      sx: { fontSize: '1rem', minHeight: '60px' }
                    }}
                    InputLabelProps={{
                      sx: { fontSize: '1rem' }
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField
                    fullWidth
                    label="Firma"
                    value={currentItem.brand}
                    onChange={(e) => setCurrentItem({ ...currentItem, brand: e.target.value })}
                    placeholder="Örn: Verbo"
                    InputProps={{
                      sx: { fontSize: '1rem', minHeight: '60px' }
                    }}
                    InputLabelProps={{
                      sx: { fontSize: '1rem' }
                    }}
                  />
                </Grid>
              </>
            )}

            {/* Miktar ve Fiyat */}
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField
                fullWidth
                label="Miktar (kg)"
                value={currentItem.quantity}
                onChange={(e) => setCurrentItem({ ...currentItem, quantity: formatNumberWithCommas(e.target.value) })}
                InputProps={{
                  sx: { fontSize: '1rem', minHeight: '60px' }
                }}
                InputLabelProps={{
                  sx: { fontSize: '1rem' }
                }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <TextField
                fullWidth
                label="Birim Fiyat"
                value={currentItem.unit_price}
                onChange={(e) => setCurrentItem({ ...currentItem, unit_price: formatDecimalNumber(e.target.value) })}
                placeholder="Örn: 2.5"
                helperText="Küsuratlı sayı girebilirsiniz (Örn: 2.5)"
                InputProps={{
                  sx: { fontSize: '1rem', minHeight: '60px' }
                }}
                InputLabelProps={{
                  sx: { fontSize: '1rem' }
                }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleAddItem}
                sx={{ height: '60px', fontSize: '1rem' }}
              >
                Ekle
              </Button>
            </Grid>

            {/* Eklenen Ürünler */}
            {newPurchase.items.length > 0 && (
              <>
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="h6">Eklenen Malzemeler</Typography>
                  </Divider>
                </Grid>
                <Grid size={{ xs: 12 }}>
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

      {/* Purchase Detail Modal */}
      <PurchaseDetailModal
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedPurchaseId(null);
        }}
        purchaseId={selectedPurchaseId}
      />

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

export default PurchaseManagement;