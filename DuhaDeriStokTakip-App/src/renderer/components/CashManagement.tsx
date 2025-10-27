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
import Pagination from './common/Pagination';
import { dbAPI } from '../services/api';
import CurrencyInput from './CurrencyInput';
import CurrencySelect from './common/CurrencySelect';
import { DEFAULT_CURRENCIES } from '../constants/currencies';

interface CashTransaction {
  id: number;
  type: 'in' | 'out';
  amount: number;
  currency?: string;
  category: string;
  description: string;
  reference_type?: 'sale' | 'payment' | 'expense' | 'other';
  reference_id?: number;
  customer_id?: number;
  customer_name?: string;
  created_at: string;
  user: string;
  previous_balance?: number;
  new_balance?: number;
}

interface CashSummary {
  totalBalanceTRY: number;
  totalBalanceUSD: number;
  totalBalanceEUR: number;
  todayIncomeTRY: number;
  todayIncomeUSD: number;
  todayIncomeEUR: number;
  todayExpenseTRY: number;
  todayExpenseUSD: number;
  todayExpenseEUR: number;
  monthlyIncomeTRY: number;
  monthlyIncomeUSD: number;
  monthlyIncomeEUR: number;
  monthlyExpenseTRY: number;
  monthlyExpenseUSD: number;
  monthlyExpenseEUR: number;
  totalDebtTRY: number;
  totalDebtUSD: number;
  totalDebtEUR: number;
}

const CashManagement: React.FC = () => {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [summary, setSummary] = useState<CashSummary>({
    totalBalanceTRY: 0,
    totalBalanceUSD: 0,
    totalBalanceEUR: 0,
    todayIncomeTRY: 0,
    todayIncomeUSD: 0,
    todayIncomeEUR: 0,
    todayExpenseTRY: 0,
    todayExpenseUSD: 0,
    todayExpenseEUR: 0,
    monthlyIncomeTRY: 0,
    monthlyIncomeUSD: 0,
    monthlyIncomeEUR: 0,
    monthlyExpenseTRY: 0,
    monthlyExpenseUSD: 0,
    monthlyExpenseEUR: 0,
    totalDebtTRY: 0,
    totalDebtUSD: 0,
    totalDebtEUR: 0,
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
      if (response.success && response.data) {
        // İşlemleri tarih sırasına göre sırala
        const sortedTransactions = [...response.data].sort((a, b) =>
          new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
        );

        // Her işlem için önceki ve yeni bakiyeyi hesapla
        const transactionsWithBalance = calculateBalances(sortedTransactions);

        setTransactions(transactionsWithBalance.reverse()); // En yeni işlemler üstte
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

  // Bakiye hesaplama fonksiyonu
  const calculateBalances = (transactions: any[]) => {
    const balancesByCurrency: { [key: string]: number } = {
      'TRY': 0,
      'USD': 0,
      'EUR': 0
    };

    return transactions.map((transaction) => {
      const currency = transaction.currency || 'TRY';
      const previousBalance = balancesByCurrency[currency];

      // Yeni bakiyeyi hesapla
      const newBalance = transaction.type === 'in'
        ? previousBalance + transaction.amount
        : previousBalance - transaction.amount;

      // Bakiyeyi güncelle
      balancesByCurrency[currency] = newBalance;

      return {
        ...transaction,
        previous_balance: previousBalance,
        new_balance: newBalance
      };
    });
  };

  // Özet hesapla
  const calculateSummary = async (transactions: CashTransaction[]) => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().substring(0, 7);

    // Kasa işlemlerini para birimi bazında hesapla
    const cashSummary = transactions.reduce((acc, transaction) => {
      const transactionDate = transaction.created_at.split('T')[0];
      const transactionMonth = transaction.created_at.substring(0, 7);
      const currency = transaction.currency || 'USD';

      if (transaction.type === 'in') {
        if (currency === 'TRY') {
          acc.totalBalanceTRY += transaction.amount;
          if (transactionDate === today) {
            acc.todayIncomeTRY += transaction.amount;
          }
          if (transactionMonth === currentMonth) {
            acc.monthlyIncomeTRY += transaction.amount;
          }
        } else if (currency === 'EUR') {
          acc.totalBalanceEUR += transaction.amount;
          if (transactionDate === today) {
            acc.todayIncomeEUR += transaction.amount;
          }
          if (transactionMonth === currentMonth) {
            acc.monthlyIncomeEUR += transaction.amount;
          }
        } else {
          acc.totalBalanceUSD += transaction.amount;
          if (transactionDate === today) {
            acc.todayIncomeUSD += transaction.amount;
          }
          if (transactionMonth === currentMonth) {
            acc.monthlyIncomeUSD += transaction.amount;
          }
        }
      } else {
        if (currency === 'TRY') {
          acc.totalBalanceTRY -= transaction.amount;
          if (transactionDate === today) {
            acc.todayExpenseTRY += transaction.amount;
          }
          if (transactionMonth === currentMonth) {
            acc.monthlyExpenseTRY += transaction.amount;
          }
        } else if (currency === 'EUR') {
          acc.totalBalanceEUR -= transaction.amount;
          if (transactionDate === today) {
            acc.todayExpenseEUR += transaction.amount;
          }
          if (transactionMonth === currentMonth) {
            acc.monthlyExpenseEUR += transaction.amount;
          }
        } else {
          acc.totalBalanceUSD -= transaction.amount;
          if (transactionDate === today) {
            acc.todayExpenseUSD += transaction.amount;
          }
          if (transactionMonth === currentMonth) {
            acc.monthlyExpenseUSD += transaction.amount;
          }
        }
      }

      return acc;
    }, {
      totalBalanceTRY: 0,
      totalBalanceUSD: 0,
      totalBalanceEUR: 0,
      todayIncomeTRY: 0,
      todayIncomeUSD: 0,
      todayIncomeEUR: 0,
      todayExpenseTRY: 0,
      todayExpenseUSD: 0,
      todayExpenseEUR: 0,
      monthlyIncomeTRY: 0,
      monthlyIncomeUSD: 0,
      monthlyIncomeEUR: 0,
      monthlyExpenseTRY: 0,
      monthlyExpenseUSD: 0,
      monthlyExpenseEUR: 0,
    });

    // Müşteri borçlarını para birimi bazında hesapla
    try {
      const customersResponse = await dbAPI.getCustomers();
      let totalDebtTRY = 0;
      let totalDebtUSD = 0;
      let totalDebtEUR = 0;

      if (customersResponse.success && customersResponse.data) {
        customersResponse.data.forEach((customer: any) => {
          // Müşteri bakiyesi negatifse borç var demektir
          // TL borcu
          const balanceTRY = customer.balanceTRY || customer.balance || 0;
          if (balanceTRY < 0) {
            totalDebtTRY += Math.abs(balanceTRY);
          }

          // USD borcu  
          const balanceUSD = customer.balanceUSD || 0;
          if (balanceUSD < 0) {
            totalDebtUSD += Math.abs(balanceUSD);
          }

          // EUR borcu
          const balanceEUR = customer.balanceEUR || 0;
          if (balanceEUR < 0) {
            totalDebtEUR += Math.abs(balanceEUR);
          }
        });
      }

      setSummary({
        ...cashSummary,
        totalDebtTRY,
        totalDebtUSD,
        totalDebtEUR,
      });
    } catch (error) {
      console.error('Error calculating customer debt:', error);
      setSummary({
        ...cashSummary,
        totalDebtTRY: 0,
        totalDebtUSD: 0,
        totalDebtEUR: 0,
      });
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  // İşlem ekle
  const handleAddTransaction = async () => {
    const newErrors: string[] = [];

    if (!amount || parseFormattedNumber(amount) <= 0) {
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
        amount: parseFormattedNumber(amount),
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
    setAmount(formatNumberWithCommas(transaction.amount.toString()));
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

    if (!amount || parseFormattedNumber(amount) <= 0) {
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
        amount: parseFormattedNumber(amount),
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
        {/* TL Kasa Bakiyesi */}
        <Grid item xs={12} sm={6} lg={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountBalanceWallet sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6">TL Kasa</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1, color: summary.totalBalanceTRY >= 0 ? 'success.main' : 'error.main' }}>
                ₺{summary.totalBalanceTRY.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                TL kasa bakiyesi
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* USD Kasa Bakiyesi */}
        <Grid item xs={12} sm={6} lg={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountBalanceWallet sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6">USD Kasa</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1, color: summary.totalBalanceUSD >= 0 ? 'success.main' : 'error.main' }}>
                ${summary.totalBalanceUSD.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                USD kasa bakiyesi
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* EUR Kasa Bakiyesi */}
        <Grid item xs={12} sm={6} lg={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountBalanceWallet sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6">EUR Kasa</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1, color: summary.totalBalanceEUR >= 0 ? 'success.main' : 'error.main' }}>
                €{summary.totalBalanceEUR.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                EUR kasa bakiyesi
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Bugünkü Gelir */}
        <Grid item xs={12} sm={6} lg={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6">Bugünkü Gelir</Typography>
              </Box>
              <Typography variant="h6" sx={{ mb: 0.5, color: 'success.main' }}>
                ₺{summary.todayIncomeTRY.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="h6" sx={{ mb: 0.5, color: 'success.main' }}>
                ${summary.todayIncomeUSD.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="h6" sx={{ mb: 1, color: 'success.main' }}>
                €{summary.todayIncomeEUR.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gider: ₺{summary.todayExpenseTRY.toLocaleString('tr-TR')} / ${summary.todayExpenseUSD.toLocaleString('tr-TR')} / €{summary.todayExpenseEUR.toLocaleString('tr-TR')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Aylık Gelir */}
        <Grid item xs={12} sm={6} lg={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney sx={{ color: 'info.main', mr: 1 }} />
                <Typography variant="h6">Aylık Gelir</Typography>
              </Box>
              <Typography variant="h6" sx={{ mb: 0.5, color: 'info.main' }}>
                ₺{summary.monthlyIncomeTRY.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="h6" sx={{ mb: 0.5, color: 'info.main' }}>
                ${summary.monthlyIncomeUSD.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="h6" sx={{ mb: 1, color: 'info.main' }}>
                €{summary.monthlyIncomeEUR.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Net: ₺{(summary.monthlyIncomeTRY - summary.monthlyExpenseTRY).toLocaleString('tr-TR')} / ${(summary.monthlyIncomeUSD - summary.monthlyExpenseUSD).toLocaleString('tr-TR')} / €{(summary.monthlyIncomeEUR - summary.monthlyExpenseEUR).toLocaleString('tr-TR')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Aylık Gider */}
        <Grid item xs={12} sm={6} lg={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingDown sx={{ color: 'error.main', mr: 1 }} />
                <Typography variant="h6">Aylık Gider</Typography>
              </Box>
              <Typography variant="h6" sx={{ mb: 0.5, color: 'error.main' }}>
                ₺{summary.monthlyExpenseTRY.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="h6" sx={{ mb: 0.5, color: 'error.main' }}>
                ${summary.monthlyExpenseUSD.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="h6" sx={{ mb: 1, color: 'error.main' }}>
                €{summary.monthlyExpenseEUR.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bu ay toplam
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Toplam Borç */}
        <Grid item xs={12} sm={6} lg={2}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Warning sx={{ color: 'warning.main', mr: 1 }} />
                <Typography variant="h6">Alacaklar Toplamı</Typography>
              </Box>
              <Typography variant="h6" sx={{ mb: 0.5, color: 'warning.main' }}>
                ₺{summary.totalDebtTRY.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="h6" sx={{ mb: 0.5, color: 'warning.main' }}>
                ${summary.totalDebtUSD.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="h6" sx={{ mb: 1, color: 'warning.main' }}>
                €{summary.totalDebtEUR.toLocaleString('tr-TR')}
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
                  <TableCell align="right">Önceki Bakiye</TableCell>
                  <TableCell align="right">Tutar</TableCell>
                  <TableCell align="right">Yeni Bakiye</TableCell>
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
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {transaction.currency === 'TRY' ? '₺' : transaction.currency === 'EUR' ? '€' : '$'}
                        {(transaction.previous_balance || 0).toLocaleString('tr-TR')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: transaction.type === 'in' ? 'success.main' : 'error.main'
                        }}
                      >
                        {transaction.type === 'in' ? '+' : '-'}
                        {transaction.currency === 'TRY' ? '₺' : transaction.currency === 'EUR' ? '€' : '$'}
                        {transaction.amount.toLocaleString('tr-TR')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: (transaction.new_balance || 0) >= 0 ? 'success.main' : 'error.main'
                        }}
                      >
                        {transaction.currency === 'TRY' ? '₺' : transaction.currency === 'EUR' ? '€' : '$'}
                        {(transaction.new_balance || 0).toLocaleString('tr-TR')}
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
                value={amount}
                onChange={(e) => {
                  const formatted = formatNumberWithCommas(e.target.value);
                  setAmount(formatted);
                }}
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
                value={amount}
                onChange={(e) => {
                  const formatted = formatNumberWithCommas(e.target.value);
                  setAmount(formatted);
                }}
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
                <strong>Tutar:</strong> {selectedTransaction.currency === 'TRY' ? '₺' : selectedTransaction.currency === 'EUR' ? '€' : '$'}{selectedTransaction.amount.toLocaleString('tr-TR')}
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

export default CashManagement;