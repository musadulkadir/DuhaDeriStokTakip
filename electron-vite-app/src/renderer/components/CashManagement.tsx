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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  Alert,
  Paper,
  Snackbar,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Remove,
  AccountBalanceWallet,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Receipt,
  History,
  Edit,
  Delete,
  Save,
  Cancel,
  Warning,
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import CurrencyInput from './CurrencyInput';
import CurrencySelect from './common/CurrencySelect';
import { DEFAULT_CURRENCIES } from '../constants/currencies';

interface CashTransaction {
  id: number;
  type: 'in' | 'out';
  amount: number;
  category: string;
  description: string;
  reference_type?: 'sale' | 'payment' | 'expense' | 'other';
  reference_id?: number;
  customer_id?: number;
  customer_name?: string;
  created_at: string;
  user: string;
}

interface CashSummary {
  totalBalance: number;
  todayIncome: number;
  todayExpense: number;
  monthlyIncome: number;
  monthlyExpense: number;
  totalDebt: number;
}

const CashManagement: React.FC = () => {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [summary, setSummary] = useState<CashSummary>({
    totalBalance: 0,
    todayIncome: 0,
    todayExpense: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    totalDebt: 0,
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Dialog states
  const [addTransactionDialogOpen, setAddTransactionDialogOpen] = useState(false);
  const [editTransactionDialogOpen, setEditTransactionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CashTransaction | null>(null);

  // Form states
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCIES.CASH_TRANSACTION);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // Kategoriler
  const incomeCategories = [
    'Satış Geliri',
    'Müşteri Ödemesi',
    'Diğer Gelir',
    'Borç Tahsilatı',
  ];

  const expenseCategories = [
    'Tedarikçi Ödemesi',
    'Kira',
    'Elektrik',
    'Su',
    'Telefon',
    'Yakıt',
    'Yemek',
    'Kırtasiye',
    'Tamir Bakım',
    'Vergi',
    'Diğer Gider',
  ];

  // Verileri yükle
  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await dbAPI.getCashTransactions();
      if (response.success) {
        setTransactions(response.data);
        await calculateSummary(response.data);
      } else {
        setSnackbar({ open: true, message: response.error || 'İşlemler yüklenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'İşlemler yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Özet hesapla
  const calculateSummary = async (transactions: CashTransaction[]) => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().substring(0, 7);

    // Kasa işlemlerini hesapla (sadece gider/gelir işlemleri)
    const cashSummary = transactions.reduce((acc, transaction) => {
      const transactionDate = transaction.created_at.split('T')[0];
      const transactionMonth = transaction.created_at.substring(0, 7);

      if (transaction.type === 'in') {
        acc.totalBalance += transaction.amount;
        if (transactionDate === today) {
          acc.todayIncome += transaction.amount;
        }
        if (transactionMonth === currentMonth) {
          acc.monthlyIncome += transaction.amount;
        }
      } else {
        acc.totalBalance -= transaction.amount;
        if (transactionDate === today) {
          acc.todayExpense += transaction.amount;
        }
        if (transactionMonth === currentMonth) {
          acc.monthlyExpense += transaction.amount;
        }
      }

      return acc;
    }, {
      totalBalance: 0,
      todayIncome: 0,
      todayExpense: 0,
      monthlyIncome: 0,
      monthlyExpense: 0,
    });

    // Müşteri borçlarını hesapla
    try {
      const customersResponse = await dbAPI.getCustomers();
      let totalDebt = 0;
      
      if (customersResponse.success) {
        totalDebt = customersResponse.data.reduce((sum: number, customer: any) => {
          const balance = customer.balance || 0;
          // Negatif bakiye = müşteri borcu
          return sum + Math.abs(Math.min(balance, 0));
        }, 0);
      }

      setSummary({
        ...cashSummary,
        totalDebt,
      });
    } catch (error) {
      console.error('Error calculating customer debt:', error);
      setSummary({
        ...cashSummary,
        totalDebt: 0,
      });
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // İşlem ekle
  const handleAddTransaction = async () => {
    const newErrors: string[] = [];

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.push('Geçerli bir tutar girin');
    }

    if (!category) {
      newErrors.push('Kategori seçin');
    }

    if (!description.trim()) {
      newErrors.push('Açıklama girin');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const transactionData = {
        type: transactionType,
        amount: parseFloat(amount),
        currency,
        category,
        description: description.trim(),
        reference_type: 'other',
        user: 'Kasa Kullanıcısı',
      };

      const response = await dbAPI.createCashTransaction(transactionData);
      if (response.success) {
        await loadTransactions();
        setSnackbar({ open: true, message: 'İşlem başarıyla eklendi', severity: 'success' });
        handleCloseAddDialog();
      } else {
        setSnackbar({ open: true, message: response.error || 'İşlem eklenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'İşlem eklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // İşlem sil
  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return;

    setLoading(true);
    try {
      const response = await dbAPI.deleteCashTransaction(selectedTransaction.id);
      if (response.success) {
        await loadTransactions();
        setSnackbar({ open: true, message: 'İşlem başarıyla silindi', severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedTransaction(null);
      } else {
        setSnackbar({ open: true, message: response.error || 'İşlem silinemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'İşlem silinirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Dialog işlemleri
  const handleCloseAddDialog = () => {
    setAddTransactionDialogOpen(false);
    setTransactionType('in');
    setAmount('');
    setCurrency(DEFAULT_CURRENCIES.CASH_TRANSACTION);
    setCategory('');
    setDescription('');
    setErrors([]);
  };

  const handleOpenEditDialog = (transaction: CashTransaction) => {
    setSelectedTransaction(transaction);
    setTransactionType(transaction.type);
    setAmount(transaction.amount.toString());
    setCurrency(transaction.currency || 'USD');
    setCategory(transaction.category);
    setDescription(transaction.description);
    setEditTransactionDialogOpen(true);
  };

  const handleOpenDeleteDialog = (transaction: CashTransaction) => {
    setSelectedTransaction(transaction);
    setDeleteDialogOpen(true);
  };

  // İşlem güncelle
  const handleUpdateTransaction = async () => {
    if (!selectedTransaction) return;

    const newErrors: string[] = [];

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.push('Geçerli bir tutar girin');
    }

    if (!category) {
      newErrors.push('Kategori seçin');
    }

    if (!description.trim()) {
      newErrors.push('Açıklama girin');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const transactionData = {
        type: transactionType,
        amount: parseFloat(amount),
        currency,
        category,
        description: description.trim(),
      };

      const response = await dbAPI.updateCashTransaction(selectedTransaction.id, transactionData);
      if (response.success) {
        await loadTransactions();
        setSnackbar({ open: true, message: 'İşlem başarıyla güncellendi', severity: 'success' });
        handleCloseEditDialog();
      } else {
        setSnackbar({ open: true, message: response.error || 'İşlem güncellenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'İşlem güncellenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseEditDialog = () => {
    setEditTransactionDialogOpen(false);
    setSelectedTransaction(null);
    setTransactionType('in');
    setAmount('');
    setCurrency(DEFAULT_CURRENCIES.CASH_TRANSACTION);
    setCategory('');
    setDescription('');
    setErrors([]);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Kasa Yönetimi
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Nakit giriş-çıkış işlemlerini yönetin ve takip edin
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountBalanceWallet sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6">Kasa Bakiyesi</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1, color: summary.totalBalance >= 0 ? 'success.main' : 'error.main' }}>
                ${summary.totalBalance.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Güncel kasa durumu
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6">Bugünkü Gelir</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1, color: 'success.main' }}>
                ${summary.todayIncome.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gider: ${summary.todayExpense.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney sx={{ color: 'info.main', mr: 1 }} />
                <Typography variant="h6">Aylık Gelir</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1, color: 'info.main' }}>
                ${summary.monthlyIncome.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Net: ${(summary.monthlyIncome - summary.monthlyExpense).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingDown sx={{ color: 'error.main', mr: 1 }} />
                <Typography variant="h6">Aylık Gider</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1, color: 'error.main' }}>
                ${summary.monthlyExpense.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bu ay toplam
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Warning sx={{ color: 'warning.main', mr: 1 }} />
                <Typography variant="h6">Toplam Borç</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1, color: 'warning.main' }}>
                ${summary.totalDebt.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Müşteri borçları
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddTransactionDialogOpen(true)}
            size="large"
          >
            Yeni İşlem
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            startIcon={<History />}
            size="large"
          >
            Geçmiş Rapor
          </Button>
        </Grid>
      </Grid>

      {/* Transactions Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Son İşlemler ({transactions.length} kayıt)
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Tip</TableCell>
                  <TableCell>Kategori</TableCell>
                  <TableCell>Açıklama</TableCell>
                  <TableCell align="right">Tutar</TableCell>
                  <TableCell align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      {new Date(transaction.created_at).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.type === 'in' ? 'Giriş' : 'Çıkış'}
                        color={transaction.type === 'in' ? 'success' : 'error'}
                        size="small"
                        icon={transaction.type === 'in' ? <TrendingUp /> : <TrendingDown />}
                      />
                    </TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell>
                      {transaction.description}
                      {transaction.customer_name && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Müşteri: {transaction.customer_name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600,
                          color: transaction.type === 'in' ? 'success.main' : 'error.main'
                        }}
                      >
                        {transaction.type === 'in' ? '+' : '-'}${transaction.amount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenEditDialog(transaction)}
                        disabled={transaction.reference_type === 'sale'}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleOpenDeleteDialog(transaction)}
                        disabled={transaction.reference_type === 'sale'}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {loading ? 'Yükleniyor...' : 'Henüz işlem kaydı bulunmuyor'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={addTransactionDialogOpen} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Kasa İşlemi</DialogTitle>
        <DialogContent>
          {errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="large">
                <InputLabel>İşlem Tipi</InputLabel>
                <Select
                  value={transactionType}
                  label="İşlem Tipi"
                  onChange={(e) => {
                    setTransactionType(e.target.value as 'in' | 'out');
                    setCategory(''); // Reset category when type changes
                  }}
                  sx={{ minHeight: '56px' }}
                >
                  <MenuItem value="in">Giriş (Gelir)</MenuItem>
                  <MenuItem value="out">Çıkış (Gider)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="large"
                label="Tutar"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CurrencySelect
                value={currency}
                onChange={setCurrency}
                defaultCurrency={DEFAULT_CURRENCIES.CASH_TRANSACTION}
                label="Para Birimi"
                size="large"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Kategori</InputLabel>
                <Select
                  value={category}
                  label="Kategori"
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {(transactionType === 'in' ? incomeCategories : expenseCategories).map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama"
                multiline
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="İşlem detaylarını açıklayın..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>İptal</Button>
          <Button 
            onClick={handleAddTransaction} 
            variant="contained"
            disabled={loading}
            startIcon={<Save />}
          >
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={editTransactionDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Kasa İşlemini Düzenle</DialogTitle>
        <DialogContent>
          {errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="large">
                <InputLabel>İşlem Tipi</InputLabel>
                <Select
                  value={transactionType}
                  label="İşlem Tipi"
                  onChange={(e) => {
                    setTransactionType(e.target.value as 'in' | 'out');
                    setCategory(''); // Reset category when type changes
                  }}
                  sx={{ minHeight: '56px' }}
                >
                  <MenuItem value="in">Giriş (Gelir)</MenuItem>
                  <MenuItem value="out">Çıkış (Gider)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="large"
                label="Tutar"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <CurrencySelect
                value={currency}
                onChange={setCurrency}
                defaultCurrency={DEFAULT_CURRENCIES.CASH_TRANSACTION}
                label="Para Birimi"
                size="large"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="large">
                <InputLabel>Kategori</InputLabel>
                <Select
                  value={category}
                  label="Kategori"
                  onChange={(e) => setCategory(e.target.value)}
                  sx={{ minHeight: '56px' }}
                >
                  {(transactionType === 'in' ? incomeCategories : expenseCategories).map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Açıklama"
                multiline
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="İşlem detaylarını açıklayın..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>İptal</Button>
          <Button 
            onClick={handleUpdateTransaction} 
            variant="contained"
            disabled={loading}
            startIcon={<Save />}
          >
            {loading ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>İşlemi Sil</DialogTitle>
        <DialogContent>
          <Typography>
            Bu işlemi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </Typography>
          {selectedTransaction && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>İşlem:</strong> {selectedTransaction.description}
              </Typography>
              <Typography variant="body2">
                <strong>Tutar:</strong> ${selectedTransaction.amount.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <strong>Kategori:</strong> {selectedTransaction.category}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button 
            onClick={handleDeleteTransaction} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Siliniyor...' : 'Sil'}
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

export default CashManagement;