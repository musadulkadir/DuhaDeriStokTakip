import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
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
  EmailOutlined,
  Work,
  AccountBalance,
  TrendingUp,
  Delete,
  PointOfSaleOutlined
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import CurrencySelect from './common/CurrencySelect';
import { DEFAULT_CURRENCIES } from '../constants/currencies';
import { CashTransaction } from '@/main/database/models';
import Pagination from './common/Pagination';

interface Employee {
  id?: number;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  salary?: number;
  balance?: number;
  hire_date?: string;
  status: 'active' | 'inactive';
}

interface EmployeePayment {
  id: number;
  amount: number;
  currency: string;
  paymentType: string;
  paymentDate: string;
  notes?: string;
}

interface EmployeeStats {
  totalPayments: number;
  totalPaidByCurrency: { [currency: string]: number };
  currentBalanceByCurrency: { [currency: string]: number };
  lastPaymentDate?: string;
}

const EmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const employeeId = parseInt(id || '0');

  const [employee, setEmployee] = useState<Employee | undefined>(undefined);
  const [payments, setPayments] = useState<EmployeePayment[]>([]);
  const [stats, setStats] = useState<EmployeeStats>({
    totalPayments: 0,
    totalPaidByCurrency: {},
    currentBalanceByCurrency: {},
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPaymentsCount, setTotalPaymentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<EmployeePayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('salary');
  const [paymentCurrency, setPaymentCurrency] = useState(DEFAULT_CURRENCIES.EMPLOYEE_PAYMENT);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Çalışan verilerini yükle
  const loadEmployeeData = async () => {
    if (!employeeId) return;

    setLoading(true);
    try {
      // Çalışan bilgilerini yükle
      const employeeResponse = await dbAPI.getEmployeeById(employeeId);
      if (employeeResponse.success) {
        setEmployee(employeeResponse.data);
      }

      // Çalışan ödemelerini yükle
      const paymentsResponse = await dbAPI.getEmployeePayments(employeeId, currentPage, itemsPerPage);
      console.log('🔍 Payments Response:', paymentsResponse);
      console.log('🔍 Response type:', typeof paymentsResponse);

      // Eski API formatı kontrolü - eğer response.data varsa ama total/currencyTotals yoksa
      const isOldFormat = paymentsResponse.success && paymentsResponse.data &&
        (paymentsResponse.total === undefined || paymentsResponse.currencyTotals === undefined);

      if (isOldFormat) {
        console.log('⚠️ Old API format detected, manually calculating totals...');
      }

      if (paymentsResponse.success) {
        if (paymentsResponse.data && paymentsResponse.data.length > 0) {
          const formattedPayments = paymentsResponse.data.map((payment: any) => ({
            id: payment.id,
            amount: payment.amount,
            currency: payment.currency || 'TRY',
            paymentType: payment.payment_type,
            paymentDate: payment.payment_date,
            notes: payment.notes,
          }));
          setPayments(formattedPayments);
          console.log('✅ Formatted payments:', formattedPayments.length);
        } else {
          setPayments([]);
        }

        let totalCount = paymentsResponse.total || 0;
        let currTotals = paymentsResponse.currencyTotals || [];

        // Eğer total veya currencyTotals undefined ise, manuel hesapla
        if (isOldFormat && paymentsResponse.data) {
          console.log('📊 Manually calculating totals from data...');
          totalCount = paymentsResponse.data.length;

          // Currency totals'ı manuel hesapla
          const currencyMap: { [key: string]: number } = {};
          paymentsResponse.data.forEach((payment: any) => {
            const curr = payment.currency || 'TRY';
            currencyMap[curr] = (currencyMap[curr] || 0) + (Number(payment.amount) || 0);
          });

          currTotals = Object.entries(currencyMap).map(([currency, total_amount]) => ({
            currency,
            total_amount
          }));

          console.log('✅ Manually calculated - Total:', totalCount, 'Currency totals:', currTotals);
        }

        setTotalPaymentsCount(totalCount);
        console.log('✅ Total payments count:', totalCount);
        console.log('✅ Currency totals:', currTotals);

        // İstatistikleri hesapla
        if (employeeResponse.data) {
          calculateStats(employeeResponse.data, currTotals, totalCount);
        }
      }

    } catch (error) {
      console.error('Error loading employee data:', error);
      setSnackbar({ open: true, message: 'Çalışan verileri yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // İstatistikleri hesapla
  const calculateStats = (employee: Employee, currencyTotals: any[], totalCount: number) => {
    console.log('📊 calculateStats called:', { currencyTotals, totalCount });

    const totalPaidByCurrency: { [currency: string]: number } = {};
    const currentBalanceByCurrency: { [currency: string]: number } = {};

    // Para birimlerine göre toplam ödemeleri hesapla
    if (currencyTotals && currencyTotals.length > 0) {
      currencyTotals.forEach((total: any) => {
        const currency = total.currency || 'TRY';
        totalPaidByCurrency[currency] = Number(total.total_amount) || 0;
        console.log(`💰 Currency: ${currency}, Amount: ${total.total_amount}`);
      });
    } else {
      // Eğer hiç ödeme yoksa, varsayılan olarak TRY'yi 0 ile göster
      totalPaidByCurrency['TRY'] = 0;
      console.log('⚠️ No currency totals, setting TRY to 0');
    }

    // Çalışan bakiyesi - şimdilik sadece TRY (gelecekte multi-currency olabilir)
    currentBalanceByCurrency['TRY'] = employee?.balance || 0;
    console.log('💳 Balance TRY:', employee?.balance);

    const newStats = {
      totalPayments: totalCount,
      totalPaidByCurrency,
      currentBalanceByCurrency,
    };

    console.log('📈 Setting stats:', newStats);
    setStats(newStats);
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Ödeme ekle
  const handleAddPayment = async () => {
    if (!employee || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      setSnackbar({ open: true, message: 'Geçerli bir ödeme tutarı girin', severity: 'error' });
      return;
    }

    try {
      const amount = parseFloat(paymentAmount);

      // Ödeme kaydı oluştur
      const paymentData = {
        employee_id: employeeId,
        amount,
        currency: paymentCurrency,
        payment_type: paymentType,
        payment_date: new Date(paymentDate).toISOString(),
        notes: paymentNotes || `Çalışan ödemesi - ${employee.name}`,
      };

      const paymentResponse = await dbAPI.createEmployeePayment(paymentData);
      if (!paymentResponse.success || !paymentResponse.data) {
        throw new Error(paymentResponse.error || 'Ödeme kaydedilemedi');
      }

      // Çalışan bakiyesini güncelle
      const newBalance = (Number(employee.balance) || 0) - amount;
      await dbAPI.updateEmployeeBalance(employeeId, newBalance);

      // Kasa işlemi oluştur (gider)
      const cashTransactionData: CashTransaction = {
        type: 'out',
        amount,
        currency: paymentCurrency,
        category: 'Çalışan Ödemesi',
        description: `${employee.name} - ${paymentType === 'salary' ? 'Maaş' : paymentType === 'bonus' ? 'Prim' : paymentType === 'advance' ? 'Avans' : 'Diğer'} ödemesi`,
        reference_type: 'employee_payment',
        reference_id: paymentResponse.data.id,
        user: 'İK Kullanıcısı',
        date: new Date(paymentDate).toISOString(),
      };

      await dbAPI.createCashTransaction(cashTransactionData);

      setSnackbar({ open: true, message: 'Ödeme başarıyla kaydedildi', severity: 'success' });

      // Formu temizle ve dialog'u kapat
      setPaymentAmount('');
      setPaymentType('salary');
      setPaymentCurrency(DEFAULT_CURRENCIES.EMPLOYEE_PAYMENT);
      setPaymentNotes('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentDialogOpen(false);

      // Verileri yeniden yükle
      await loadEmployeeData();

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
    if (!selectedPayment || !employee) return;

    try {
      // Ödeme kaydını sil
      await dbAPI.deleteEmployeePayment(selectedPayment.id);

      // Çalışan bakiyesini güncelle (ödeme tutarını geri çıkar)
      const newBalance = (employee.balance || 0) - selectedPayment.amount;
      await dbAPI.updateEmployeeBalance(employeeId, newBalance);

      // Kasa işlemini tersine çevir (gelir olarak ekle)
      const cashTransactionData: CashTransaction = {
        type: 'in',
        amount: selectedPayment.amount,
        category: 'Ödeme İptali',
        description: `${employee.name} - Ödeme iptali`,
        reference_type: 'payment_cancel',
        user: 'İK Kullanıcısı',
      };

      await dbAPI.createCashTransaction(cashTransactionData);

      setSnackbar({ open: true, message: 'Ödeme başarıyla silindi', severity: 'success' });
      setDeletePaymentDialogOpen(false);
      setSelectedPayment(null);

      // Verileri yeniden yükle
      await loadEmployeeData();

    } catch (error) {
      console.error('Delete payment error:', error);
      setSnackbar({
        open: true,
        message: 'Ödeme silinirken hata oluştu',
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    loadEmployeeData();
  }, [employeeId, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!employee) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Çalışan bulunamadı
        </Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/employees')} sx={{ mt: 2 }}>
          Çalışan Listesine Dön
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/employees')}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {employee.name}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Çalışan Detay Sayfası
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Payment />}
          onClick={() => setPaymentDialogOpen(true)}
          size="large"
        >
          Ödeme Yap
        </Button>
      </Box>

      {/* Employee Info & Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Employee Info Card - Yatay Layout */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                {/* Sol taraf - Avatar ve İsim */}
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 200 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60, mr: 2 }}>
                    <Person sx={{ fontSize: 30 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {employee.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Çalışan #{employee.id}
                    </Typography>
                  </Box>
                </Box>

                {/* Sağ taraf - Bilgiler (2'şer yatay) */}
                <Box sx={{ flexGrow: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Work sx={{ mr: 1.5, color: 'text.secondary', fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Pozisyon</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {employee.position || 'Belirtilmemiş'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Phone sx={{ mr: 1.5, color: 'text.secondary', fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Telefon</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {employee.phone || 'Belirtilmemiş'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EmailOutlined sx={{ mr: 1.5, color: 'text.secondary', fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Email</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {employee.email || 'Belirtilmemiş'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PointOfSaleOutlined sx={{ mr: 1.5, color: 'text.secondary', fontSize: 20 }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">Maaş</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        ₺{(employee.salary || 0).toLocaleString('tr-TR')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Stats Cards - 4,1,1 Layout */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main', width: 40, height: 40, mr: 2 }}>
                <TrendingUp fontSize="small" />
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Toplam Ödenen
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.5 }}>
                  {Object.entries(stats.totalPaidByCurrency).map(([currency, amount]) => (
                    <Typography key={currency} variant="h6" sx={{ fontWeight: 700 }}>
                      {currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : '€'}{amount.toLocaleString('tr-TR')}
                    </Typography>
                  ))}
                  {Object.keys(stats.totalPaidByCurrency).length === 0 && (
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>₺0</Typography>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'info.main', width: 40, height: 40, mr: 2 }}>
                <Payment fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Toplam Ödeme
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {stats.totalPayments}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{
                bgcolor: employee.status === 'active' ? 'success.main' : 'error.main',
                width: 40, height: 40, mr: 2
              }}>
                <Person fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Durum
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {employee.status === 'active' ? 'Aktif' : 'Pasif'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payment History */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 0 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Ödeme Geçmişi ({totalPaymentsCount} ödeme)
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tarih</TableCell>
                  <TableCell align="right">Tutar</TableCell>
                  <TableCell>Para Birimi</TableCell>
                  <TableCell>Tip</TableCell>
                  <TableCell>Notlar</TableCell>
                  <TableCell align="center">İşlem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} hover>
                    <TableCell>
                      {new Date(payment.paymentDate).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
                        -{payment.currency === 'TRY' ? '₺' : payment.currency === 'USD' ? '$' : '€'}{payment.amount.toLocaleString('tr-TR')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.currency}
                        variant="outlined"
                        size="small"
                        color="primary"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          payment.paymentType === 'salary' ? 'Maaş' :
                            payment.paymentType === 'bonus' ? 'Prim' :
                              payment.paymentType === 'advance' ? 'Avans' : 'Diğer'
                        }
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{payment.notes || '-'}</TableCell>
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
                    <TableCell colSpan={6} align="center">
                      {loading ? 'Yükleniyor...' : 'Henüz ödeme kaydı bulunmuyor'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalPaymentsCount / itemsPerPage)}
        totalItems={totalPaymentsCount}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ödeme Yap - {employee.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="medium"
                label="Ödeme Tutarı"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CurrencySelect
                value={paymentCurrency}
                onChange={setPaymentCurrency}
                defaultCurrency={DEFAULT_CURRENCIES.EMPLOYEE_PAYMENT}
                label="Para Birimi"
                size="large"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="medium"
                label="Ödeme Tarihi"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="medium">
                <InputLabel>Ödeme Tipi</InputLabel>
                <Select
                  value={paymentType}
                  label="Ödeme Tipi"
                  onChange={(e) => setPaymentType(e.target.value)}
                  sx={{ minHeight: '56px' }}
                >
                  <MenuItem value="salary">Maaş</MenuItem>
                  <MenuItem value="bonus">Prim</MenuItem>
                  <MenuItem value="advance">Avans</MenuItem>
                  <MenuItem value="other">Diğer</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="medium"
                label="Notlar (Opsiyonel)"
                multiline
                rows={3}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Ödeme ile ilgili notlar..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>İptal</Button>
          <Button
            onClick={handleAddPayment}
            variant='contained'
            disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
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
                <strong>Tutar:</strong> {selectedPayment.currency === 'TRY' ? '₺' : selectedPayment.currency === 'USD' ? '$' : '€'}{selectedPayment.amount.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2">
                <strong>Para Birimi:</strong> {selectedPayment.currency}
              </Typography>
              <Typography variant="body2">
                <strong>Tarih:</strong> {new Date(selectedPayment.paymentDate).toLocaleDateString('tr-TR')}
              </Typography>
              <Typography variant="body2">
                <strong>Tip:</strong> {selectedPayment.paymentType === 'salary' ? 'Maaş' :
                  selectedPayment.paymentType === 'bonus' ? 'Prim' :
                    selectedPayment.paymentType === 'advance' ? 'Avans' : 'Diğer'}
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

export default EmployeeDetail;