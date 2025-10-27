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
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Payment,
  Person,
  Phone,
  Business,
  Work,
  AccountBalance,
  TrendingUp,
  AttachMoney,
  Delete,
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import CurrencySelect from './common/CurrencySelect';
import { DEFAULT_CURRENCIES } from '../constants/currencies';

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
  paymentType: string;
  paymentDate: string;
  notes?: string;
}

interface EmployeeStats {
  totalPayments: number;
  totalPaid: number;
  currentBalance: number;
  lastPaymentDate?: string;
}

const EmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const employeeId = parseInt(id || '0');

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [payments, setPayments] = useState<EmployeePayment[]>([]);
  const [stats, setStats] = useState<EmployeeStats>({
    totalPayments: 0,
    totalPaid: 0,
    currentBalance: 0,
  });
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
      const paymentsResponse = await dbAPI.getEmployeePayments(employeeId);
      if (paymentsResponse.success) {
        const formattedPayments = paymentsResponse.data.map((payment: any) => ({
          id: payment.id,
          amount: payment.amount,
          paymentType: payment.payment_type,
          paymentDate: payment.payment_date,
          notes: payment.notes,
        }));
        setPayments(formattedPayments);
      }

      // İstatistikleri hesapla
      calculateStats(employeeResponse.data, paymentsResponse.data || []);

    } catch (error) {
      console.error('Error loading employee data:', error);
      setSnackbar({ open: true, message: 'Çalışan verileri yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // İstatistikleri hesapla
  const calculateStats = (employee: Employee, payments: any[]) => {
    const totalPayments = payments.length;
    const totalPaid = payments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
    
    const lastPayment = payments.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];

    setStats({
      totalPayments,
      totalPaid,
      currentBalance: employee?.balance || 0,
      lastPaymentDate: lastPayment?.payment_date,
    });
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
        payment_date: new Date().toISOString(),
        notes: paymentNotes || `Çalışan ödemesi - ${employee.name}`,
      };

      const paymentResponse = await dbAPI.createEmployeePayment(paymentData);
      if (!paymentResponse.success) {
        throw new Error(paymentResponse.error || 'Ödeme kaydedilemedi');
      }

      // Çalışan bakiyesini güncelle
      const newBalance = (employee.balance || 0) + amount;
      await dbAPI.updateEmployeeBalance(employeeId, newBalance);

      // Kasa işlemi oluştur (gider)
      const cashTransactionData = {
        type: 'out',
        amount,
        currency: paymentCurrency,
        category: 'Çalışan Ödemesi',
        description: `${employee.name} - ${paymentType === 'salary' ? 'Maaş' : paymentType === 'bonus' ? 'Prim' : paymentType === 'advance' ? 'Avans' : 'Diğer'} ödemesi`,
        reference_type: 'employee_payment',
        reference_id: paymentResponse.data.id,
        user: 'İK Kullanıcısı',
      };
      
      await dbAPI.createCashTransaction(cashTransactionData);

      setSnackbar({ open: true, message: 'Ödeme başarıyla kaydedildi', severity: 'success' });
      
      // Formu temizle ve dialog'u kapat
      setPaymentAmount('');
      setPaymentType('salary');
      setPaymentCurrency(DEFAULT_CURRENCIES.EMPLOYEE_PAYMENT);
      setPaymentNotes('');
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
      const cashTransactionData = {
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
  }, [employeeId]);

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
        {/* Employee Info */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
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
              
              <List dense>
                <ListItem>
                  <Work sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText 
                    primary="Pozisyon" 
                    secondary={employee.position || 'Belirtilmemiş'} 
                  />
                </ListItem>
                <ListItem>
                  <Phone sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText 
                    primary="Telefon" 
                    secondary={employee.phone || 'Belirtilmemiş'} 
                  />
                </ListItem>
                <ListItem>
                  <Business sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText 
                    primary="Email" 
                    secondary={employee.email || 'Belirtilmemiş'} 
                  />
                </ListItem>
                <ListItem>
                  <AttachMoney sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText 
                    primary="Maaş" 
                    secondary={`₺${(employee.salary || 0).toLocaleString('tr-TR')}`} 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Stats Cards */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}>
                    <Payment />
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {stats.totalPayments}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Toplam Ödeme
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}>
                    <TrendingUp />
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    ₺{stats.totalPaid.toLocaleString('tr-TR')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Toplam Ödenen
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 1 }}>
                    <AccountBalance />
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    ₺{stats.currentBalance.toLocaleString('tr-TR')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Güncel Bakiye
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center', p: 2 }}>
                  <Avatar sx={{ 
                    bgcolor: employee.status === 'active' ? 'success.main' : 'error.main', 
                    mx: 'auto', mb: 1 
                  }}>
                    <Person />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {employee.status === 'active' ? 'Aktif' : 'Pasif'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Durum
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Payment History */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Ödeme Geçmişi ({payments.length} ödeme)
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tarih</TableCell>
                  <TableCell align="right">Tutar</TableCell>
                  <TableCell>Tip</TableCell>
                  <TableCell>Notlar</TableCell>
                  <TableCell align="center">İşlem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.paymentDate).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                        +₺{payment.amount.toLocaleString('tr-TR')}
                      </Typography>
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
                    <TableCell colSpan={5} align="center">
                      Henüz ödeme kaydı bulunmuyor
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ödeme Yap - {employee.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="large"
                label="Ödeme Tutarı"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CurrencySelect
                value={paymentCurrency}
                onChange={setPaymentCurrency}
                defaultCurrency={DEFAULT_CURRENCIES.EMPLOYEE_PAYMENT}
                label="Para Birimi"
                size="large"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="large">
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="large"
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
            variant="contained"
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
                <strong>Tutar:</strong> ₺{selectedPayment.amount.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2">
                <strong>Tarih:</strong> {new Date(selectedPayment.paymentDate).toLocaleDateString('tr-TR')}
              </Typography>
              <Typography variant="body2">
                <strong>Tip:</strong> {selectedPayment.paymentType}
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