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
  Divider,
  Alert,
  Paper,
  Snackbar,
} from '@mui/material';
import {
  Add,
  Delete,
  ShoppingCart,
  Receipt,
  Clear,
  CheckCircle,
  Visibility,
} from '@mui/icons-material';
import Pagination from './common/Pagination';
import { dbAPI } from '../services/api';
import { Product, Customer } from '../../main/database/models';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatDateTime, getNowISO } from '../utils/dateUtils';
import CurrencySelect from './common/CurrencySelect';
import { DEFAULT_CURRENCIES } from '../constants/currencies';
import SaleDetailModal from './SaleDetailModal';

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
  currency: string;
  items: SaleItem[];
  total: number;
  date: string;
}

const SalesManagement: React.FC = () => {
  const navigate = useNavigate();

  // URL'den customerId'yi al
  const searchParams = new URLSearchParams(window.location.search);
  const customerIdFromUrl = searchParams.get('customerId');

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);

  // Date filter states
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [salesTotals, setSalesTotals] = useState<Record<string, number>>({});
  const [dayCount, setDayCount] = useState<number>(0);

  // New sale state
  const [newSaleDialogOpen, setNewSaleDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewingSaleId, setViewingSaleId] = useState<number | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityPieces, setQuantityPieces] = useState<string>('');
  const [quantityDesi, setQuantityDesi] = useState<string>('');
  const [unitPricePerDesi, setUnitPricePerDesi] = useState<string>('');
  const [saleCurrency, setSaleCurrency] = useState(DEFAULT_CURRENCIES.SALES);
  const [errors, setErrors] = useState<string[]>([]);

  // Tutar formatlama fonksiyonları
  const formatNumberWithCommas = (value: string): string => {
    // Sadece rakam ve nokta karakterlerini al
    const numericValue = value.replace(/[^\d.]/g, '');

    // Eğer boşsa boş döndür
    if (!numericValue) return '';

    // Sayıyı parçalara ayır (tam kısım ve ondalık kısım)
    const parts = numericValue.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Tam kısmı üç haneli ayraçlarla formatla
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Ondalık kısım varsa ekle
    return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  };

  const parseFormattedNumber = (value: string): number => {
    // Virgülleri kaldır ve sayıya çevir
    return parseFloat(value.replace(/,/g, '')) || 0;
  };

  // Load data
  const loadProducts = async () => {
    try {
      console.log('Loading products...');
      const response = await dbAPI.getProducts();
      console.log('Products response:', response);
      if (response.success && response.data) {
        console.log('Products loaded:', response.data.length, 'products');
        setProducts(response.data);
      } else {
        console.error('Failed to load products:', response.error);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await dbAPI.getCustomers();
      if (response.success && response.data) {
        setCustomers(response.data);
      } else {
        setSnackbar({ open: true, message: response.error || 'Müşteriler yüklenemedi', severity: 'error' });
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      setSnackbar({ open: true, message: 'Müşteriler yüklenirken hata oluştu', severity: 'error' });
    }
  };

  const loadSales = async (page = currentPage, limit = itemsPerPage) => {
    try {
      const response = await dbAPI.getSales(startDate || undefined, endDate || undefined);
      if (response.success && response.data) {
        // Satış verilerini grupla ve dönüştür
        const salesMap = new Map();

        response.data.forEach((row: any) => {
          if (!salesMap.has(row.id)) {
            // Tarih formatını düzelt - Date objesi veya string olabilir
            let dateStr = row.sale_date;
            if (typeof dateStr === 'object' && dateStr !== null) {
              dateStr = new Date(dateStr).toISOString().split('T')[0];
            } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
              dateStr = dateStr.split('T')[0];
            }

            salesMap.set(row.id, {
              id: row.id,
              customerId: row.customer_id,
              customerName: row.customer_name || row.name || 'Bilinmeyen Müşteri',
              currency: row.currency || 'TRY',
              total: row.total_amount,
              date: dateStr,
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

        const allSales = Array.from(salesMap.values());
        // Client-side pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedSales = allSales.slice(startIndex, endIndex);

        setSales(paginatedSales);
        setTotalItems(allSales.length);

        // Backend'den gelen toplamları kaydet
        setSalesTotals(response.totals || {});

        // Gün sayısını hesapla
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          setDayCount(Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        } else {
          setDayCount(0);
        }
      }
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  useEffect(() => {
    loadSales();
  }, [currentPage, itemsPerPage, startDate, endDate]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const addItemToSale = () => {
    const newErrors: string[] = [];

    if (!selectedProduct) {
      newErrors.push('Lütfen bir ürün seçin');
    }

    if (!quantityPieces || parseInt(quantityPieces) <= 0) {
      newErrors.push('Geçerli bir adet miktarı girin');
    }

    if (!quantityDesi || parseFormattedNumber(quantityDesi) <= 0) {
      newErrors.push('Geçerli bir desi miktarı girin');
    }

    if (!unitPricePerDesi || parseFormattedNumber(unitPricePerDesi) <= 0) {
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
      quantityDesi: parseFormattedNumber(quantityDesi),
      unitPricePerDesi: parseFormattedNumber(unitPricePerDesi),
      total: parseFormattedNumber(quantityDesi) * parseFormattedNumber(unitPricePerDesi),
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
        sale_date: getNowISO(),
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

      // Müşteri bakiyesi artık satış ve ödeme kayıtlarından hesaplanıyor, ayrı güncelleme gerekmiyor

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

  const handleDeleteSale = async (saleId: number) => {
    if (!window.confirm('Bu satışı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await dbAPI.deleteSale(saleId);
      if (!response.success) {
        throw new Error(response.error || 'Satış silinemedi');
      }

      setSnackbar({ open: true, message: 'Satış başarıyla silindi', severity: 'success' });
      await loadSales();
      await loadProducts(); // Stok güncellemesi için
      await loadCustomers(); // Bakiye güncellemesi için
    } catch (error) {
      console.error('Delete sale error:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Satış silinirken hata oluştu',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 2, mr: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
            Satış İşlemleri
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Deri satışlarınızı yönetin ve takip edin
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setNewSaleDialogOpen(true)}
            size="large"
          >
            Yeni Satış
          </Button>
          <Button
            variant="outlined"
            startIcon={<Receipt />}
            size="large"
            onClick={() => navigate('/reports')}
          >
            Satış Raporu
          </Button>
        </Box>
      </Box>

      {/* Date Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Başlangıç Tarihi"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Bitiş Tarihi"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - 1);
                    setStartDate(date.toISOString().split('T')[0]);
                    setEndDate(new Date().toISOString().split('T')[0]);
                  }}
                  size="small"
                >
                  Son 1 Ay
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - 3);
                    setStartDate(date.toISOString().split('T')[0]);
                    setEndDate(new Date().toISOString().split('T')[0]);
                  }}
                  size="small"
                >
                  Son 3 Ay
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  size="small"
                >
                  Tümü
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Sales Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h6" sx={{ color: 'success.main', mb: 1 }}>
                Toplam Satış (TL)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                ₺{(salesTotals.TRY || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {dayCount > 0 ? `${dayCount} günlük toplam` : 'Tüm zamanlar'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h6" sx={{ color: 'info.main', mb: 1 }}>
                Toplam Satış (USD)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                ${(salesTotals.USD || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {dayCount > 0 ? `${dayCount} günlük toplam` : 'Tüm zamanlar'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h6" sx={{ color: 'warning.main', mb: 1 }}>
                Toplam Satış (EUR)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                €{(salesTotals.EUR || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {dayCount > 0 ? `${dayCount} günlük toplam` : 'Tüm zamanlar'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h6" sx={{ color: 'primary.main', mb: 1 }}>
                Toplam Satış
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {totalItems}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {dayCount > 0 ? `${dayCount} günlük toplam` : 'Tüm zamanlar'}
              </Typography>
            </CardContent>
          </Card>
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
                        {sale.currency === 'USD' ? '$' : sale.currency === 'TRY' ? '₺' : '€'}{sale.total.toLocaleString('tr-TR')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(sale.date).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setViewingSaleId(sale.id)}
                          title="Satış Detayı"
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteSale(sale.id)}
                          title="Satışı Sil"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
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
        maxWidth="md"
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

          <Grid container spacing={2} sx={{ pt: 1 }}>
            {/* Top Row - Currency & Customer */}
            <Grid size={{ xs: 12, md: 4 }}>
              <CurrencySelect
                value={saleCurrency}
                onChange={setSaleCurrency}
                defaultCurrency={DEFAULT_CURRENCIES.SALES}
                label="Para Birimi"
                size="medium"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 8 }}>
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => `${option.name || 'İsimsiz'} | ${option.phone || 'Telefon yok'} | Bakiye: -${option.balance} `}
                value={selectedCustomer}
                onChange={(_, newValue) => setSelectedCustomer(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Müşteri Seç" fullWidth size="medium" />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body1">{option.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.phone || 'Telefon yok'} - Bakiye: ₺{(option.balance || 0).toLocaleString('tr-TR')}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            {/* Product Addition Row - Full Width */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Autocomplete
                options={products}
                getOptionLabel={(option) => `${option.category} - ${option.color}`}
                value={selectedProduct}
                onChange={(_, newValue) => setSelectedProduct(newValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Ürün Seç" size="medium" fullWidth />
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
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Satılacak ürünü seçin
              </Typography>
            </Grid>

            <Grid size={{ xs: 6, md: 2 }}>
              <TextField
                label="Adet"
                value={quantityPieces}
                onChange={(e) => setQuantityPieces(formatNumberWithCommas(e.target.value))}
                fullWidth
                size="medium"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Stoktan düşecek
              </Typography>
            </Grid>

            <Grid size={{ xs: 6, md: 2 }}>
              <TextField
                label="Desi"
                value={quantityDesi}
                onChange={(e) => setQuantityDesi(formatNumberWithCommas(e.target.value))}
                fullWidth
                size="medium"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Fiyat hesabı için
              </Typography>
            </Grid>

            <Grid size={{ xs: 6, md: 2 }}>
              <TextField
                label={`Desi Fiyatı (${saleCurrency === 'USD' ? '$' : saleCurrency === 'TRY' ? '₺' : '€'})`}
                value={unitPricePerDesi}
                onChange={(e) => setUnitPricePerDesi(formatNumberWithCommas(e.target.value))}
                fullWidth
                size="medium"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Birim fiyat girin
              </Typography>
            </Grid>

            <Grid size={{ xs: 6, md: 2 }}>
              <TextField
                label="Toplam"
                value={quantityDesi && unitPricePerDesi ?
                  formatNumberWithCommas((parseFormattedNumber(quantityDesi) * parseFormattedNumber(unitPricePerDesi)).toFixed(2)) : '0'}
                disabled
                fullWidth
                size="medium"
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Otomatik hesaplanan
              </Typography>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Button
                variant="contained"
                onClick={addItemToSale}
                startIcon={<Add />}
                fullWidth
                size="large"
              >
                Ürün Ekle
              </Button>
            </Grid>

            {/* Sale Items */}
            <Grid size={{ xs: 12 }}>
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
                                <TableCell align="right">{Number(item.quantityPieces).toLocaleString('tr-TR')} adet</TableCell>
                                <TableCell align="right">{Number(item.quantityDesi).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} desi</TableCell>
                                <TableCell align="right">{saleCurrency === 'USD' ? '$' : saleCurrency === 'TRY' ? '₺' : '€'}{Number(item.unitPricePerDesi).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/desi</TableCell>
                                <TableCell align="right">{saleCurrency === 'USD' ? '$' : saleCurrency === 'TRY' ? '₺' : '€'}{Number(item.total).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
                          Genel Toplam: {saleCurrency === 'USD' ? '$' : saleCurrency === 'TRY' ? '₺' : '€'}{calculateTotal().toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* YENİ: Ayırdığımız modalı buraya ekleyin */}
      <SaleDetailModal
        open={viewingSaleId !== null}
        onClose={() => setViewingSaleId(null)}
        saleId={viewingSaleId}
      />
      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalItems / itemsPerPage)}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

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

export default SalesManagement;