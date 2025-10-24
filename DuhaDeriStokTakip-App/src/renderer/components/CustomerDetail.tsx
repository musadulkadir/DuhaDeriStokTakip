import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Avatar,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  Payment,
  Person,
  Phone,
  LocationOn,
  Business,
  AccountBalance,
  TrendingUp,
  ShoppingCart,
  AttachMoney,
  Delete,
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import { Customer } from '../../main/database/models';

interface CustomerSale {
  id: number;
  date: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totalAmount: number;
  currency?: string;
  status: string;
}

interface CustomerPayment {
  id: number;
  amount: number;
  paymentType: string;
  paymentDate: string;
  currency?: string;
  notes?: string;
}

interface CustomerStats {
  totalSales: number;
  totalPurchasesTRY: number;
  totalPurchasesUSD: number;
  totalPurchasesEUR: number;
  totalPaymentsTRY: number;
  totalPaymentsUSD: number;
  totalPaymentsEUR: number;
  currentBalance: number;
  balanceTRY?: number;
  balanceUSD?: number;
  balanceEUR?: number;
  lastSaleDate?: string;
  lastPaymentDate?: string;
}

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = parseInt(id || '0');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<CustomerSale[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    totalSales: 0,
    totalPurchasesTRY: 0,
    totalPurchasesUSD: 0,
    totalPurchasesEUR: 0,
    totalPaymentsTRY: 0,
    totalPaymentsUSD: 0,
    totalPaymentsEUR: 0,
    currentBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<CustomerPayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [paymentCurrency, setPaymentCurrency] = useState('TRY');
  const [paymentNotes, setPaymentNotes] = useState('');

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

  // Müşteri verilerini yükle
  const loadCustomerData = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      // Müşteri bilgilerini yükle
      const customerResponse = await dbAPI.getCustomerById(customerId);
      if (customerResponse.success && customerResponse.data) {
        setCustomer(customerResponse.data);
      }

      // Müşteri ödemelerini yükle
      const paymentsResponse = await dbAPI.getCustomerPayments(customerId);
      if (paymentsResponse.success && paymentsResponse.data) {
        const formattedPayments = paymentsResponse.data.map((payment: any) => ({
          id: payment.id,
          amount: payment.amount,
          paymentType: payment.payment_type,
          paymentDate: payment.payment_date,
          currency: payment.currency || 'TRY',
          notes: payment.notes,
        }));
        setPayments(formattedPayments);
      }

      // Satış verilerini yükle (bu müşteriye ait)
      const salesResponse = await dbAPI.getSales();
      if (salesResponse.success && salesResponse.data) {
        // Bu müşteriye ait satışları filtrele
        const customerSales = salesResponse.data
          .filter((sale: any) => sale.customer_id === customerId)
          .map((sale: any) => ({
            id: sale.id,
            date: sale.sale_date,
            totalAmount: sale.total_amount,
            currency: sale.currency || 'TRY',
            status: sale.payment_status,
            items: [] // Satış detayları için ayrı sorgu gerekebilir
          }));
        setSales(customerSales);
      }

      // İstatistikleri hesapla
      if (customerResponse.data) {
        calculateStats(customerResponse.data, paymentsResponse.data || [], salesResponse.data || []);
      }

    } catch (error) {
      console.error('Error loading customer data:', error);
      setSnackbar({ open: true, message: 'Müşteri verileri yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // İstatistikleri hesapla
  const calculateStats = (_customer: Customer, payments: any[], allSales: any[]) => {
    const customerSales = allSales.filter((sale: any) => sale.customer_id === customerId);

    const totalSales = customerSales.length;

    // Para birimi bazında hesaplama
    const totalPurchasesTRY = customerSales.filter((sale: any) => (sale.currency || 'TRY') === 'TRY').reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
    const totalPurchasesUSD = customerSales.filter((sale: any) => (sale.currency || 'TRY') === 'USD').reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
    const totalPurchasesEUR = customerSales.filter((sale: any) => (sale.currency || 'TRY') === 'EUR').reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);

    const totalPaymentsTRY = payments.filter((payment: any) => (payment.currency || 'TRY') === 'TRY').reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
    const totalPaymentsUSD = payments.filter((payment: any) => (payment.currency || 'TRY') === 'USD').reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
    const totalPaymentsEUR = payments.filter((payment: any) => (payment.currency || 'TRY') === 'EUR').reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);

    // Güncel bakiye = Toplam ödemeler - Toplam alışveriş (negatif değer borç demek)
    const balanceTRY = totalPaymentsTRY - totalPurchasesTRY;
    const balanceUSD = totalPaymentsUSD - totalPurchasesUSD;
    const balanceEUR = totalPaymentsEUR - totalPurchasesEUR;

    const lastSale = customerSales.sort((a: any, b: any) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())[0];
    const lastPayment = payments.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];

    setStats({
      totalSales,
      totalPurchasesTRY,
      totalPurchasesUSD,
      totalPurchasesEUR,
      totalPaymentsTRY,
      totalPaymentsUSD,
      totalPaymentsEUR,
      currentBalance: balanceTRY + balanceUSD + balanceEUR, // Toplam için birleştir (basit toplama)
      balanceTRY, // TL bakiyesi
      balanceUSD, // USD bakiyesi
      balanceEUR, // EUR bakiyesi
      lastSaleDate: lastSale?.sale_date,
      lastPaymentDate: lastPayment?.payment_date,
    });
  };

  // Ödeme ekle
  const handleAddPayment = async () => {
    if (!customer || !paymentAmount || parseFormattedNumber(paymentAmount) <= 0) {
      setSnackbar({ open: true, message: 'Geçerli bir ödeme tutarı girin', severity: 'error' });
      return;
    }

    try {
      const amount = parseFormattedNumber(paymentAmount);

      // Ödeme kaydı oluştur
      const paymentData = {
        customer_id: customerId,
        amount,
        currency: paymentCurrency,
        payment_type: paymentType,
        payment_date: new Date().toISOString(),
        notes: paymentNotes || `Müşteri ödemesi - ${customer.name}`,
      };

      const paymentResponse = await dbAPI.createPayment(paymentData);
      if (!paymentResponse.success || !paymentResponse.data) {
        throw new Error(paymentResponse.error || 'Ödeme kaydedilemedi');
      }

      // Müşteri bakiyesi artık ödeme kayıtlarından hesaplanıyor, ayrı güncelleme gerekmiyor

      // Kasa işlemi oluştur (gelir)
      const cashTransactionData = {
        type: 'in' as const,
        amount,
        currency: paymentCurrency,
        category: 'Müşteri Ödemesi',
        description: `${customer.name} - Ödeme`,
        reference_type: 'payment',
        reference_id: paymentResponse.data.id,
        customer_id: customerId,
        user: 'Kasa Kullanıcısı',
      };

      await dbAPI.createCashTransaction(cashTransactionData);

      setSnackbar({ open: true, message: 'Ödeme başarıyla kaydedildi', severity: 'success' });

      // Formu temizle ve dialog'u kapat
      setPaymentAmount('');
      setPaymentType('cash');
      setPaymentCurrency('TRY');
      setPaymentNotes('');
      setPaymentDialogOpen(false);

      // Verileri yeniden yükle
      await loadCustomerData();

    } catch (error) {
      console.error('Payment error:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Ödeme kaydedilirken hata oluştu',
        severity: 'error'
      });
    }
  };

  // Ödeme sil
  const handleDeletePayment = async () => {
    if (!selectedPayment || !customer) return;

    try {
      // Ödeme kaydını sil
      const deleteResponse = await dbAPI.deletePayment(selectedPayment.id);
      if (!deleteResponse.success) {
        throw new Error(deleteResponse.error || 'Ödeme silinemedi');
      }

      // Müşteri bakiyesi artık ödeme kayıtlarından hesaplanıyor, ayrı güncelleme gerekmiyor

      // Kasa işlemini tersine çevir (gider olarak ekle)
      const cashTransactionData = {
        type: 'out' as const,
        amount: selectedPayment.amount,
        currency: selectedPayment.currency || 'TRY',
        category: 'Ödeme İptali',
        description: `${customer.name} - Ödeme iptali`,
        reference_type: 'payment_cancel',
        customer_id: customerId,
        user: 'Kasa Kullanıcısı',
      };

      await dbAPI.createCashTransaction(cashTransactionData);

      setSnackbar({ open: true, message: 'Ödeme başarıyla silindi', severity: 'success' });
      setDeletePaymentDialogOpen(false);
      setSelectedPayment(null);

      // Verileri yeniden yükle
      await loadCustomerData();

    } catch (error) {
      console.error('Delete payment error:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Ödeme silinirken hata oluştu',
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Müşteri bulunamadı
        </Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/customers')} sx={{ mt: 2 }}>
          Müşteri Listesine Dön
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/customers')}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {customer.name}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Müşteri Detay Sayfası
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Payment />}
          onClick={() => setPaymentDialogOpen(true)}
          size="large"
        >
          Ödeme Al
        </Button>
      </Box>

      {/* Customer Info & Stats */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        {/* Customer Info */}
        <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60, mr: 2 }}>
                  <Person sx={{ fontSize: 30 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {customer.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Müşteri #{customer.id}
                  </Typography>
                </Box>
              </Box>

              <List dense>
                <ListItem>
                  <Phone sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Telefon"
                    secondary={customer.phone || 'Belirtilmemiş'}
                  />
                </ListItem>
                <ListItem>
                  <Business sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Email"
                    secondary={customer.email || 'Belirtilmemiş'}
                  />
                </ListItem>
                <ListItem>
                  <LocationOn sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Adres"
                    secondary={customer.address || 'Belirtilmemiş'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ flex: '2 1 600px', minWidth: '600px' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}>
                  <ShoppingCart />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {stats.totalSales}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Satış
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}>
                  <TrendingUp />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  ₺{stats.totalPurchasesTRY.toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  ${stats.totalPurchasesUSD.toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  €{stats.totalPurchasesEUR.toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Alışveriş
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 1 }}>
                  <AttachMoney />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  ₺{stats.totalPaymentsTRY.toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  ${stats.totalPaymentsUSD.toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  €{stats.totalPaymentsEUR.toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Ödeme
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Avatar sx={{
                  bgcolor: stats.currentBalance >= 0 ? 'success.main' : 'error.main',
                  mx: 'auto', mb: 1
                }}>
                  <AccountBalance />
                </Avatar>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: stats.currentBalance >= 0 ? 'success.main' : 'error.main'
                  }}
                >
                  ₺{(stats.balanceTRY || 0)} / ${(stats.balanceUSD || 0)} / €{(stats.balanceEUR || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Güncel Bakiye (TL / USD / EUR)
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* Tables */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Sales History */}
        <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Satış Geçmişi ({sales.length} satış)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tarih</TableCell>
                      <TableCell align="right">Tutar</TableCell>
                      <TableCell align="center">İşlem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sales.slice(0, 10).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          {new Date(sale.date).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell align="right">
                          {sale.currency === 'TRY' ? '₺' : sale.currency === 'EUR' ? '€' : '$'}{sale.totalAmount || 0}
                        </TableCell>

                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              // Satış durumu güncelleme dialog'u açılacak
                              console.log('Update sale status:', sale.id);
                            }}
                          >
                            Güncelle
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {sales.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          Henüz satış kaydı bulunmuyor
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Payment History */}
        <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Ödeme Geçmişi ({payments.length} ödeme)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tarih</TableCell>
                      <TableCell align="right">Tutar</TableCell>
                      <TableCell>Tip</TableCell>
                      <TableCell align="center">İşlem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.slice(0, 10).map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.paymentDate).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                            +{payment.currency === 'TRY' ? '₺' : payment.currency === 'EUR' ? '€' : '$'}{payment.amount.toLocaleString('tr-TR')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={payment.paymentType === 'cash' ? 'Nakit' : 'Banka'}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setDeletePaymentDialogOpen(true);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {payments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          Henüz ödeme kaydı bulunmuyor
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ödeme Al - {customer.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <TextField
                  fullWidth
                  label="Ödeme Tutarı"
                  value={paymentAmount}
                  onChange={(e) => {
                    const formatted = formatNumberWithCommas(e.target.value);
                    setPaymentAmount(formatted);
                  }}
                  slotProps={{
                    input: {
                      startAdornment: <Typography sx={{ mr: 1 }}>{paymentCurrency === 'TRY' ? '₺' : paymentCurrency === 'EUR' ? '€' : '$'}</Typography>,
                    }
                  }}
                />
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <FormControl fullWidth>
                  <InputLabel>Para Birimi</InputLabel>
                  <Select
                    value={paymentCurrency}
                    label="Para Birimi"
                    onChange={(e) => setPaymentCurrency(e.target.value)}
                  >
                    <MenuItem value="TRY">₺ Türk Lirası</MenuItem>
                    <MenuItem value="USD">$ Amerikan Doları</MenuItem>
                    <MenuItem value="EUR">€ Euro</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Ödeme Tipi</InputLabel>
              <Select
                value={paymentType}
                label="Ödeme Tipi"
                onChange={(e) => setPaymentType(e.target.value)}
              >
                <MenuItem value="cash">Nakit</MenuItem>
                <MenuItem value="bank_transfer">Banka Transferi</MenuItem>
                <MenuItem value="check">Çek</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Notlar (Opsiyonel)"
              multiline
              rows={3}
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Ödeme ile ilgili notlar..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPaymentAmount('');
            setPaymentType('cash');
            setPaymentCurrency('TRY');
            setPaymentNotes('');
            setPaymentDialogOpen(false);
          }}>İptal</Button>
          <Button
            onClick={handleAddPayment}
            variant="contained"
            disabled={!paymentAmount || parseFormattedNumber(paymentAmount) <= 0}
          >
            Ödeme Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Payment Dialog */}
      <Dialog open={deletePaymentDialogOpen} onClose={() => setDeletePaymentDialogOpen(false)}>
        <DialogTitle>Ödeme Kaydını Sil</DialogTitle>
        <DialogContent>
          <Typography>
            Bu ödeme kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </Typography>
          {selectedPayment && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Tutar:</strong> {selectedPayment.currency === 'TRY' ? '₺' : selectedPayment.currency === 'EUR' ? '€' : '$'}{selectedPayment.amount.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2">
                <strong>Tarih:</strong> {new Date(selectedPayment.paymentDate).toLocaleDateString('tr-TR')}
              </Typography>
              <Typography variant="body2">
                <strong>Tip:</strong> {selectedPayment.paymentType === 'cash' ? 'Nakit' : 'Banka'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletePaymentDialogOpen(false)}>İptal</Button>
          <Button
            onClick={handleDeletePayment}
            color="error"
            variant="contained"
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default CustomerDetail;