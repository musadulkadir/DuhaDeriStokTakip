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
  SwapHoriz,
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
  reference_type?: 'sale' | 'payment' | 'supplier_payment' | 'expense' | 'other';
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Dialog states
  const [addTransactionDialogOpen, setAddTransactionDialogOpen] = useState(false);
  const [editTransactionDialogOpen, setEditTransactionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currencyExchangeDialogOpen, setCurrencyExchangeDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CashTransaction | null>(null);

  // Form states
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCIES.CASH_TRANSACTION);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // Para çevirme form states
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');

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
      const amount = Number(transaction.amount) || 0;

      // Yeni bakiyeyi hesapla
      const newBalance = transaction.type === 'in'
        ? previousBalance + amount
        : previousBalance - amount;

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
    let cashSummary;
    try {
      cashSummary = transactions.reduce((acc, transaction) => {
        // created_at kontrolü
        if (!transaction.created_at) {
          console.warn('created_at yok:', transaction);
          return acc;
        }

        // created_at'i string'e çevir (Date objesi olabilir)
        const createdAtStr = typeof transaction.created_at === 'string'
          ? transaction.created_at
          : new Date(transaction.created_at).toISOString();

        const transactionDate = createdAtStr.split('T')[0];
        const transactionMonth = createdAtStr.substring(0, 7);
        const currency = transaction.currency || 'TRY';
        const amount = Number(transaction.amount) || 0;

        if (transaction.type === 'in') {
          if (currency === 'TRY') {
            acc.totalBalanceTRY += amount;
            if (transactionDate === today) {
              acc.todayIncomeTRY += amount;
            }
            if (transactionMonth === currentMonth) {
              acc.monthlyIncomeTRY += amount;
            }
          } else if (currency === 'EUR') {
            acc.totalBalanceEUR += amount;
            if (transactionDate === today) {
              acc.todayIncomeEUR += amount;
            }
            if (transactionMonth === currentMonth) {
              acc.monthlyIncomeEUR += amount;
            }
          } else {
            acc.totalBalanceUSD += amount;
            if (transactionDate === today) {
              acc.todayIncomeUSD += amount;
            }
            if (transactionMonth === currentMonth) {
              acc.monthlyIncomeUSD += amount;
            }
          }
        } else {
          if (currency === 'TRY') {
            acc.totalBalanceTRY -= amount;
            if (transactionDate === today) {
              acc.todayExpenseTRY += amount;
            }
            if (transactionMonth === currentMonth) {
              acc.monthlyExpenseTRY += amount;
            }
          } else if (currency === 'EUR') {
            acc.totalBalanceEUR -= amount;
            if (transactionDate === today) {
              acc.todayExpenseEUR += amount;
            }
            if (transactionMonth === currentMonth) {
              acc.monthlyExpenseEUR += amount;
            }
          } else {
            acc.totalBalanceUSD -= amount;
            if (transactionDate === today) {
              acc.todayExpenseUSD += amount;
            }
            if (transactionMonth === currentMonth) {
              acc.monthlyExpenseUSD += amount;
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
    } catch (error) {
      console.error('Reduce hatası:', error);
      cashSummary = {
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
      };
    }

    // Müşteri borçlarını (alacaklar) para birimi bazında hesapla
    try {
      const customersResponse = await dbAPI.getCustomers();
      let totalDebtTRY = 0;
      let totalDebtUSD = 0;
      let totalDebtEUR = 0;

      if (customersResponse.success && customersResponse.data) {
        customersResponse.data.forEach((customer: any) => {
          // Sadece müşterileri al (tedarikçileri değil)
          if (customer.type !== 'customer') return;

          // Müşteri bakiyesi pozitifse bize borçlu demektir (alacak)
          // TL alacağı
          const balanceTRY = Number(customer.balance || 0);
          if (balanceTRY > 0) {
            totalDebtTRY += balanceTRY;
          }

          // USD alacağı
          const balanceUSD = Number(customer.balance_usd || 0);
          if (balanceUSD > 0) {
            totalDebtUSD += balanceUSD;
          }

          // EUR alacağı
          const balanceEUR = Number(customer.balance_eur || 0);
          if (balanceEUR > 0) {
            totalDebtEUR += balanceEUR;
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

  // Para çevirme işlemi
  const handleCurrencyExchange = async () => {
    const newErrors: string[] = [];

    const fromAmt = parseFormattedNumber(fromAmount);
    const toAmt = parseFormattedNumber(toAmount);

    if (!fromAmount || fromAmt <= 0) {
      newErrors.push('Çıkış tutarı girin');
    }

    if (!toAmount || toAmt <= 0) {
      newErrors.push('Giriş tutarı girin');
    }

    if (fromCurrency === toCurrency) {
      newErrors.push('Farklı para birimleri seçin');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // 1. Çıkış işlemi (out)
      const outTransaction = {
        type: 'out' as const,
        amount: fromAmt,
        currency: fromCurrency,
        category: 'Para Çevirme',
        description: `${fromCurrency} → ${toCurrency} çevirme işlemi (Çıkış)`,
        reference_type: 'other' as const,
        user: 'Kasa Kullanıcısı',
      };

      const outResponse = await dbAPI.createCashTransaction(outTransaction);
      if (!outResponse.success) {
        throw new Error('Çıkış işlemi başarısız');
      }

      // 2. Giriş işlemi (in)
      const inTransaction = {
        type: 'in' as const,
        amount: toAmt,
        currency: toCurrency,
        category: 'Para Çevirme',
        description: `${fromCurrency} → ${toCurrency} çevirme işlemi (Giriş)`,
        reference_type: 'other' as const,
        user: 'Kasa Kullanıcısı',
      };

      const inResponse = await dbAPI.createCashTransaction(inTransaction);
      if (!inResponse.success) {
        throw new Error('Giriş işlemi başarısız');
      }

      await loadTransactions();
      setSnackbar({ open: true, message: 'Para çevirme işlemi başarıyla tamamlandı', severity: 'success' });
      handleCloseCurrencyExchangeDialog();
    } catch (error) {
      setSnackbar({ open: true, message: 'Para çevirme işlemi başarısız oldu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCurrencyExchangeDialog = () => {
    setCurrencyExchangeDialogOpen(false);
    setFromCurrency('USD');
    setToCurrency('EUR');
    setFromAmount('');
    setToAmount('');
    setErrors([]);
  };

  // İşlem sil
  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return;

    setLoading(true);
    try {
      // Eğer bu işlem bir ödeme referansı içeriyorsa, ilgili ödemeyi de sil
      if (selectedTransaction.reference_type === 'supplier_payment' && selectedTransaction.reference_id) {
        try {
          await dbAPI.deletePayment(selectedTransaction.reference_id);
        } catch (error) {
          console.error('İlgili ödeme silinirken hata:', error);
        }
      } else if (selectedTransaction.reference_type === 'payment' && selectedTransaction.reference_id) {
        // Müşteri ödemesi ise
        try {
          await dbAPI.deletePayment(selectedTransaction.reference_id);
        } catch (error) {
          console.error('İlgili ödeme silinirken hata:', error);
        }
      }

      // Kasa işlemini sil
      const response = await dbAPI.deleteCashTransaction(selectedTransaction.id);
      if (response.success) {
        await loadTransactions();
        setSnackbar({ open: true, message: 'İşlem ve ilgili kayıtlar başarıyla silindi', severity: 'success' });
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
        <Grid item xs={12} sm={6} md={3}>
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
        <Grid item xs={12} sm={6} md={3}>
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
        <Grid item xs={12} sm={6} md={3}>
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

        {/* Toplam Alacaklar */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ color: 'warning.main', mr: 1 }} />
                <Typography variant="h6">Alacaklar Toplamı</Typography>
              </Box>
              <Typography variant="h6" sx={{ mb: 0.5, color: 'warning.main' }}>
                ₺{summary.totalDebtTRY.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="h6" sx={{ mb: 0.5, color: 'warning.main' }}>
                ${summary.totalDebtUSD.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="h6" sx={{ color: 'warning.main' }}>
                €{summary.totalDebtEUR.toLocaleString('tr-TR')}
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
            startIcon={<SwapHoriz />}
            onClick={() => setCurrencyExchangeDialogOpen(true)}
            size="large"
            color="secondary"
          >
            Para Çevirme
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
            <Table sx={{ tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '10%' }}>Tarih</TableCell>
                  <TableCell sx={{ width: '10%' }}>Tip</TableCell>
                  <TableCell sx={{ width: '12%' }}>Kategori</TableCell>
                  <TableCell sx={{ width: '20%' }}>Açıklama</TableCell>
                  <TableCell align="right" sx={{ width: '13%' }}>Önceki Bakiye</TableCell>
                  <TableCell align="right" sx={{ width: '13%' }}>Tutar</TableCell>
                  <TableCell align="right" sx={{ width: '13%' }}>Yeni Bakiye</TableCell>
                  <TableCell align="center" sx={{ width: '9%' }}>İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const paginatedTransactions = transactions.slice(startIndex, endIndex);
                  return paginatedTransactions.map((transaction) => (
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
                  ));
                })()}
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

          {/* Pagination */}
          {transactions.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(transactions.length / itemsPerPage)}
              totalItems={transactions.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
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

      {/* Currency Exchange Dialog */}
      <Dialog
        open={currencyExchangeDialogOpen}
        onClose={handleCloseCurrencyExchangeDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Para Çevirme İşlemi</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {errors.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Bir para biriminden diğerine çevirme işlemi yapın
                </Typography>
              </Grid>

              {/* Çıkış Para Birimi */}
              <Grid size={{ xs: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Çıkış Para Birimi</InputLabel>
                  <Select
                    value={fromCurrency}
                    label="Çıkış Para Birimi"
                    onChange={(e) => setFromCurrency(e.target.value)}
                  >
                    <MenuItem value="TRY">TRY (₺)</MenuItem>
                    <MenuItem value="USD">USD ($)</MenuItem>
                    <MenuItem value="EUR">EUR (€)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Çıkış Tutarı */}
              <Grid size={{ xs: 3 }}>
                <TextField
                  fullWidth
                  label="Çıkış Tutarı"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(formatNumberWithCommas(e.target.value))}
                  placeholder="0.00"
                />
              </Grid>

              {/* Swap Icon */}
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                <SwapHoriz sx={{ fontSize: 40, color: 'primary.main' }} />
              </Grid>

              {/* Giriş Para Birimi */}
              <Grid size={{ xs: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Giriş Para Birimi</InputLabel>
                  <Select
                    value={toCurrency}
                    label="Giriş Para Birimi"
                    onChange={(e) => setToCurrency(e.target.value)}
                  >
                    <MenuItem value="TRY">TRY (₺)</MenuItem>
                    <MenuItem value="USD">USD ($)</MenuItem>
                    <MenuItem value="EUR">EUR (€)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Giriş Tutarı */}
              <Grid size={{ xs: 3 }}>
                <TextField
                  fullWidth
                  label="Giriş Tutarı"
                  value={toAmount}
                  onChange={(e) => setToAmount(formatNumberWithCommas(e.target.value))}
                  placeholder="0.00"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCurrencyExchangeDialog}>İptal</Button>
          <Button
            onClick={handleCurrencyExchange}
            variant="contained"
            disabled={loading}
            startIcon={<SwapHoriz />}
          >
            {loading ? 'İşleniyor...' : 'Çevir'}
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