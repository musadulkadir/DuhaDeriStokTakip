import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Add,
  Payment,
  ShoppingCart,
  Business,
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import { Customer } from '../../main/database/models';

interface Purchase {
  id: number;
  date?: string;
  purchase_date?: string;
  created_at?: string;
  total_amount: number;
  currency: string;
  description?: string;
  status: string;
}

interface Payment {
  id: number;
  date?: string;
  payment_date?: string;
  created_at?: string;
  amount: number;
  currency?: string;
  payment_type: string;
  payment_method?: string;
  description?: string;
}

interface NewPayment {
  amount: string;
  currency: string;
  payment_method: string;
  description: string;
}

const SupplierDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Customer | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const [newPayment, setNewPayment] = useState<NewPayment>({
    amount: '',
    currency: 'TRY',
    payment_method: 'cash',
    description: '',
  });

  // Tedarikçi bakiyesini hesapla
  const calculateSupplierBalance = () => {
    const totalPurchasesTRY = purchases.filter(p => (p.currency || 'TRY') === 'TRY').reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const totalPurchasesUSD = purchases.filter(p => (p.currency || 'TRY') === 'USD').reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const totalPurchasesEUR = purchases.filter(p => (p.currency || 'TRY') === 'EUR').reduce((sum, p) => sum + (p.total_amount || 0), 0);

    const totalPaymentsTRY = payments.filter(p => (p.currency || 'TRY') === 'TRY').reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPaymentsUSD = payments.filter(p => (p.currency || 'TRY') === 'USD').reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPaymentsEUR = payments.filter(p => (p.currency || 'TRY') === 'EUR').reduce((sum, p) => sum + (p.amount || 0), 0);

    // Bakiye = Alışlar - Ödemeler (pozitif değer borç demek)
    const balanceTRY = totalPurchasesTRY - totalPaymentsTRY;
    const balanceUSD = totalPurchasesUSD - totalPaymentsUSD;
    const balanceEUR = totalPurchasesEUR - totalPaymentsEUR;

    return { balanceTRY, balanceUSD, balanceEUR };
  };

  // Tedarikçi bilgilerini yükle
  const loadSupplier = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await dbAPI.getCustomerById(parseInt(id));
      if (response.success && response.data) {
        setSupplier(response.data);
      } else {
        setSnackbar({ open: true, message: response.error || 'Tedarikçi bulunamadı', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Tedarikçi yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Alım geçmişini yükle
  const loadPurchases = async () => {
    if (!id) return;

    try {
      const response = await dbAPI.getPurchases();
      if (response.success) {
        // Sadece bu tedarikçiye ait alımları filtrele
        const supplierPurchases = response.data.filter((purchase: any) => purchase.supplier_id === parseInt(id));
        console.log('Alım verileri:', supplierPurchases);
        setPurchases(supplierPurchases);
      } else {
        console.error('Alım geçmişi yüklenemedi:', response.error);
        setPurchases([]);
      }
    } catch (error) {
      console.error('Alım geçmişi yüklenirken hata:', error);
      setPurchases([]);
    }
  };

  // Ödeme geçmişini yükle
  const loadPayments = async () => {
    if (!id) return;

    try {
      const response = await dbAPI.getCustomerPayments(parseInt(id));
      if (response.success) {
        const payments = (response.data || []).map((payment: any) => ({
          ...payment,
          currency: payment.currency || 'TRY'
        }));
        setPayments(payments);
      }
    } catch (error) {
      console.error('Ödeme geçmişi yüklenirken hata:', error);
    }
  };

  useEffect(() => {
    loadSupplier();
    loadPurchases();
    loadPayments();
  }, [id]);

  const handleAddPayment = async () => {
    if (!supplier || !newPayment.amount) return;

    setLoading(true);
    try {
      const paymentData = {
        customer_id: supplier.id!,
        amount: parseFloat(newPayment.amount.replace(/,/g, '')),
        currency: newPayment.currency,
        payment_method: newPayment.payment_method,
        description: newPayment.description || undefined,
        date: new Date().toISOString(),
      };

      const response = await dbAPI.createPayment(paymentData);
      if (response.success) {
        // Kasadan ödeme tutarını düş
        const cashTransactionData = {
          type: 'out' as const,
          amount: paymentData.amount,
          currency: paymentData.currency,
          category: 'supplier_payment',
          description: `${supplier.name} tedarikçisine ödeme - ${paymentData.description || 'Tedarikçi ödemesi'}`,
          reference_type: 'supplier_payment',
          reference_id: response.data?.id,
          customer_id: supplier.id,
          user: 'Sistem Kullanıcısı',
        };

        try {
          await dbAPI.createCashTransaction(cashTransactionData);
        } catch (error) {
          console.error('Kasa işlemi oluşturulamadı:', error);
        }

        setSnackbar({ open: true, message: 'Ödeme başarıyla yapıldı ve kasadan düşürüldü', severity: 'success' });
        setPaymentDialogOpen(false);
        setNewPayment({
          amount: '',
          currency: 'TRY',
          payment_method: 'cash',
          description: '',
        });
        await loadPayments();
      } else {
        setSnackbar({ open: true, message: response.error || 'Ödeme kaydedilemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Ödeme kaydedilirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSupplier = async () => {
    if (!supplier) return;

    setLoading(true);
    try {
      const response = await dbAPI.updateCustomer(supplier.id!, supplier);
      if (response.success) {
        setSnackbar({ open: true, message: 'Tedarikçi başarıyla güncellendi', severity: 'success' });
        setEditDialogOpen(false);
      } else {
        setSnackbar({ open: true, message: response.error || 'Tedarikçi güncellenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Tedarikçi güncellenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency?: string) => {
    const curr = currency || 'TRY';
    const symbol = curr === 'USD' ? '$' : curr === 'EUR' ? '€' : '₺';
    return `${symbol}${amount.toLocaleString('tr-TR')}`;
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'error'; // Borç (kırmızı)
    if (balance < 0) return 'success'; // Alacak (yeşil)
    return 'default';
  };

  if (!supplier) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Tedarikçi bulunamadı</Typography>
      </Box>
    );
  }

  const balance = calculateSupplierBalance();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/customers')} size="large">
          <ArrowBack />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
            {supplier.name}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Tedarikçi Detayları
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => setEditDialogOpen(true)}
        >
          Düzenle
        </Button>
      </Box>

      {/* Supplier Info Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
                  <Business />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {supplier.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tedarikçi
                  </Typography>
                </Box>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Telefon</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {supplier.phone || 'Belirtilmemiş'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {supplier.email || 'Belirtilmemiş'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Adres</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {supplier.address || 'Belirtilmemiş'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Borç Durumu
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={formatCurrency(balance.balanceTRY, 'TRY')}
                  color={getBalanceColor(balance.balanceTRY) as any}
                  sx={{ mb: 1, mr: 1 }}
                />
                <Chip
                  label={formatCurrency(balance.balanceUSD, 'USD')}
                  color={getBalanceColor(balance.balanceUSD) as any}
                  sx={{ mb: 1, mr: 1 }}
                />
                <Chip
                  label={formatCurrency(balance.balanceEUR, 'EUR')}
                  color={getBalanceColor(balance.balanceEUR) as any}
                  sx={{ mb: 1 }}
                />
              </Box>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Add />}
                onClick={() => setPaymentDialogOpen(true)}
              >
                Ödeme Yap
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Content */}
      <Grid container spacing={3}>
        {/* Purchase History */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ShoppingCart sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Alım Geçmişi
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tarih</TableCell>
                      <TableCell>Tutar</TableCell>
                      <TableCell>Durum</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          Henüz alım kaydı bulunmuyor
                        </TableCell>
                      </TableRow>
                    ) : (
                      purchases.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell>
                            {(() => {
                              try {
                                // Önce purchase_date, sonra date, sonra created_at kontrol et
                                const dateValue = purchase.purchase_date || purchase.date || purchase.created_at;
                                if (!dateValue) return 'Tarih Belirtilmemiş';
                                const date = new Date(dateValue);
                                return isNaN(date.getTime()) ? 'Geçersiz Tarih' : date.toLocaleDateString('tr-TR');
                              } catch (error) {
                                return 'Geçersiz Tarih';
                              }
                            })()}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(purchase.total_amount, purchase.currency)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={purchase.status === 'completed' ? 'Tamamlandı' :
                                purchase.status === 'pending' ? 'Beklemede' :
                                  purchase.status === 'cancelled' ? 'İptal Edildi' :
                                    purchase.status || 'Bilinmiyor'}
                              size="small"
                              color={purchase.status === 'completed' ? 'success' : 'warning'}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment History */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Payment sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Ödeme Geçmişi
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tarih</TableCell>
                      <TableCell>Tutar</TableCell>
                      <TableCell>Yöntem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          Henüz ödeme kaydı bulunmuyor
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {(() => {
                              try {
                                // Önce payment_date, sonra date, sonra created_at kontrol et
                                const dateValue = payment.payment_date || payment.date || payment.created_at;
                                if (!dateValue) return 'Tarih Belirtilmemiş';
                                const date = new Date(dateValue);
                                return isNaN(date.getTime()) ? 'Geçersiz Tarih' : date.toLocaleDateString('tr-TR');
                              } catch (error) {
                                return 'Geçersiz Tarih';
                              }
                            })()}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={payment.payment_type === 'cash' ? 'Nakit' :
                                payment.payment_type === 'card' ? 'Kart' :
                                  payment.payment_type === 'transfer' ? 'Banka Transferi' :
                                    payment.payment_type === 'check' ? 'Çek' :
                                      payment.payment_type || 'Belirtilmemiş'}
                              size="small"
                              color="primary"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Payment Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>Tedarikçiye Ödeme Yap</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Tutar"
                value={newPayment.amount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d,]/g, '');
                  setNewPayment({ ...newPayment, amount: value });
                }}
                helperText="Ödenen tutarı giriniz"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Para Birimi</InputLabel>
                <Select
                  value={newPayment.currency}
                  label="Para Birimi"
                  onChange={(e) => setNewPayment({ ...newPayment, currency: e.target.value })}
                >
                  <MenuItem value="TRY">TRY (₺)</MenuItem>
                  <MenuItem value="USD">USD ($)</MenuItem>
                  <MenuItem value="EUR">EUR (€)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Ödeme Yöntemi</InputLabel>
                <Select
                  value={newPayment.payment_method}
                  label="Ödeme Yöntemi"
                  onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}
                >
                  <MenuItem value="cash">Nakit</MenuItem>
                  <MenuItem value="card">Kart</MenuItem>
                  <MenuItem value="transfer">Banka Transferi</MenuItem>
                  <MenuItem value="check">Çek</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama (Opsiyonel)"
                multiline
                rows={2}
                value={newPayment.description}
                onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                placeholder="Ödeme ile ilgili notlar..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>İptal</Button>
          <Button onClick={handleAddPayment} variant="contained" disabled={loading || !newPayment.amount}>
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>Tedarikçi Düzenle</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tedarikçi Adı"
                value={supplier?.name || ''}
                onChange={(e) => setSupplier(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefon"
                value={supplier?.phone || ''}
                onChange={(e) => setSupplier(prev => prev ? { ...prev, phone: e.target.value } : null)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={supplier?.email || ''}
                onChange={(e) => setSupplier(prev => prev ? { ...prev, email: e.target.value } : null)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adres"
                multiline
                rows={2}
                value={supplier?.address || ''}
                onChange={(e) => setSupplier(prev => prev ? { ...prev, address: e.target.value } : null)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>İptal</Button>
          <Button onClick={handleEditSupplier} variant="contained" disabled={loading}>
            {loading ? 'Güncelleniyor...' : 'Güncelle'}
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

export default SupplierDetail;