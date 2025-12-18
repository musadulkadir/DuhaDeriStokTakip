import React, { useState, useEffect } from 'react';
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
  TablePagination,
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
  Snackbar,
  Alert,
  Divider,
} from '@mui/material';
import {
  ReceiptLong,
  TrendingUp,
  TrendingDown,
  Add,
  SwapHoriz,
} from '@mui/icons-material';
import { formatDateTime, formatDate, getTodayDateString } from '../utils/dateUtils';
import { dbAPI } from '../services/api';
import CurrencySelect from './common/CurrencySelect';
import { DEFAULT_CURRENCIES } from '../constants/currencies';

// Sayı formatlama fonksiyonları
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

interface CheckTransaction {
  id: number;
  sequence_number?: string;
  is_official?: boolean;
  type: 'in' | 'out';
  amount: number;
  currency: string;
  check_type: 'check' | 'promissory_note';
  check_number?: string;
  received_date?: string;
  received_from?: string;
  first_endorser?: string;
  last_endorser?: string;
  bank_name?: string;
  branch_name?: string;
  due_date?: string;
  account_number?: string;
  description?: string;
  customer_id?: number;
  customer_name?: string;
  status?: 'active' | 'collected' | 'used' | 'protested';
  is_cashed?: boolean;
  cashed_at?: string;
  original_transaction_id?: number;
  is_converted?: boolean;
  original_currency?: string;
  original_amount?: number;
  conversion_rate?: number;
  converted_amount?: number;
  // Alınırken çevirme bilgileri
  received_converted_currency?: string;
  received_converted_amount?: number;
  received_conversion_rate?: number;
  // Verirken çevirme bilgileri
  given_converted_currency?: string;
  given_converted_amount?: number;
  given_conversion_rate?: number;
  protested_at?: string;
  protest_reason?: string;
  created_at: string;
}

const CheckManagement: React.FC = () => {
  const [transactions, setTransactions] = useState<CheckTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<CheckTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });
  
  // Summary states
  const [checkBalanceTRY, setCheckBalanceTRY] = useState(0);
  const [checkBalanceUSD, setCheckBalanceUSD] = useState(0);
  const [checkBalanceEUR, setCheckBalanceEUR] = useState(0);
  const [noteBalanceTRY, setNoteBalanceTRY] = useState(0);
  const [noteBalanceUSD, setNoteBalanceUSD] = useState(0);
  const [noteBalanceEUR, setNoteBalanceEUR] = useState(0);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [filterCheckType, setFilterCheckType] = useState<'all' | 'check' | 'promissory_note'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [cashOutDialogOpen, setCashOutDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [protestDialogOpen, setProtestDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<CheckTransaction | null>(null);
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [protestReason, setProtestReason] = useState('');
  
  // Form states
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in');
  const [checkType, setCheckType] = useState<'check' | 'promissory_note'>('check');
  const [isOfficial, setIsOfficial] = useState(true);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCIES.CASH_TRANSACTION);
  const [checkNumber, setCheckNumber] = useState('');
  const [receivedDate, setReceivedDate] = useState(getTodayDateString());
  const [receivedFrom, setReceivedFrom] = useState('');
  const [firstEndorser, setFirstEndorser] = useState('');
  const [lastEndorser, setLastEndorser] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [description, setDescription] = useState('');

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await dbAPI.getCheckTransactions();
      if (response.success && response.data) {
        console.log('🔍 Çek işlemleri yüklendi:', response.data);
        console.log('🔍 İlk çek detayı:', response.data[0]);
        setTransactions(response.data);
        setFilteredTransactions(response.data);
        calculateSummary(response.data);
      } else {
        setSnackbar({ open: true, message: response.error || 'İşlemler yüklenemedi', severity: 'error' });
      }
    } catch (error) {
      console.error('İşlemler yüklenirken hata:', error);
      setSnackbar({ open: true, message: 'İşlemler yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Tarih filtresi
    if (startDate) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.created_at).toISOString().split('T')[0];
        return transactionDate >= startDate;
      });
    }
    if (endDate) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.created_at).toISOString().split('T')[0];
        return transactionDate <= endDate;
      });
    }

    // Arama filtresi (kimden alındı, müşteri adı, çek no, banka)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        (t.received_from?.toLowerCase().includes(query)) ||
        (t.customer_name?.toLowerCase().includes(query)) ||
        (t.check_number?.toLowerCase().includes(query)) ||
        (t.bank_name?.toLowerCase().includes(query)) ||
        (t.description?.toLowerCase().includes(query))
      );
    }

    // İşlem tipi filtresi
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Çek/Senet tipi filtresi
    if (filterCheckType !== 'all') {
      filtered = filtered.filter(t => t.check_type === filterCheckType);
    }

    setFilteredTransactions(filtered);
  };

  const calculateSummary = (transactions: CheckTransaction[]) => {
    let checkTRY = 0, checkUSD = 0, checkEUR = 0;
    let noteTRY = 0, noteUSD = 0, noteEUR = 0;

    transactions.forEach(t => {
      const amount = Number(t.amount) || 0;
      const multiplier = t.type === 'in' ? 1 : -1;
      const value = amount * multiplier;

      if (t.check_type === 'check') {
        if (t.currency === 'TRY') checkTRY += value;
        else if (t.currency === 'USD') checkUSD += value;
        else if (t.currency === 'EUR') checkEUR += value;
      } else {
        if (t.currency === 'TRY') noteTRY += value;
        else if (t.currency === 'USD') noteUSD += value;
        else if (t.currency === 'EUR') noteEUR += value;
      }
    });

    setCheckBalanceTRY(checkTRY);
    setCheckBalanceUSD(checkUSD);
    setCheckBalanceEUR(checkEUR);
    setNoteBalanceTRY(noteTRY);
    setNoteBalanceUSD(noteUSD);
    setNoteBalanceEUR(noteEUR);
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTransactionType('in');
    setCheckType('check');
    setIsOfficial(true);
    setAmount('');
    setCurrency(DEFAULT_CURRENCIES.CASH_TRANSACTION);
    setCheckNumber('');
    setReceivedDate(getTodayDateString());
    setReceivedFrom('');
    setFirstEndorser('');
    setLastEndorser('');
    setBankName('');
    setBranchName('');
    setDueDate('');
    setAccountNumber('');
    setDescription('');
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setSnackbar({ open: true, message: 'Lütfen geçerli bir tutar girin', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const transaction = {
        type: transactionType,
        check_type: checkType,
        is_official: isOfficial,
        amount: parseFloat(amount),
        currency,
        check_number: checkNumber || null,
        received_date: receivedDate || null,
        received_from: receivedFrom || null,
        first_endorser: firstEndorser || null,
        last_endorser: lastEndorser || null,
        bank_name: bankName || null,
        branch_name: branchName || null,
        due_date: dueDate || null,
        account_number: accountNumber || null,
        description: description || null,
      };

      const response = await dbAPI.addCheckTransaction(transaction);
      if (response.success) {
        setSnackbar({ open: true, message: 'İşlem başarıyla eklendi', severity: 'success' });
        handleCloseDialog();
        setPage(0); // Pagination'ı sıfırla
        loadTransactions();
      } else {
        setSnackbar({ open: true, message: response.error || 'İşlem eklenemedi', severity: 'error' });
      }
    } catch (error) {
      console.error('İşlem eklenirken hata:', error);
      setSnackbar({ open: true, message: 'İşlem eklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransaction = () => {
    if (!selectedTransaction) return;
    
    // Form alanlarını doldur
    setTransactionType(selectedTransaction.type);
    setCheckType(selectedTransaction.check_type);
    setIsOfficial(selectedTransaction.is_official !== undefined ? selectedTransaction.is_official : true);
    setAmount(selectedTransaction.amount.toString());
    setCurrency(selectedTransaction.currency);
    setCheckNumber(selectedTransaction.check_number || '');
    setReceivedDate(selectedTransaction.received_date || getTodayDateString());
    setReceivedFrom(selectedTransaction.received_from || '');
    setFirstEndorser(selectedTransaction.first_endorser || '');
    setLastEndorser(selectedTransaction.last_endorser || '');
    setBankName(selectedTransaction.bank_name || '');
    setBranchName(selectedTransaction.branch_name || '');
    setDueDate(selectedTransaction.due_date || '');
    setAccountNumber(selectedTransaction.account_number || '');
    setDescription(selectedTransaction.description || '');
    
    setEditDialogOpen(true);
  };

  const handleUpdateTransaction = async () => {
    if (!selectedTransaction || !amount || parseFloat(amount) <= 0) {
      setSnackbar({ open: true, message: 'Lütfen geçerli bir tutar girin', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const updatedTransaction = {
        type: transactionType,
        check_type: checkType,
        is_official: isOfficial,
        amount: parseFloat(amount),
        currency,
        check_number: checkNumber || null,
        received_date: receivedDate || null,
        received_from: receivedFrom || null,
        first_endorser: firstEndorser || null,
        last_endorser: lastEndorser || null,
        bank_name: bankName || null,
        branch_name: branchName || null,
        due_date: dueDate || null,
        account_number: accountNumber || null,
        description: description || null,
        is_cashed: selectedTransaction.is_cashed,
        cashed_at: selectedTransaction.cashed_at,
      };

      const response = await dbAPI.updateCheckTransaction(selectedTransaction.id, updatedTransaction);
      if (response.success) {
        setSnackbar({ open: true, message: 'İşlem başarıyla güncellendi', severity: 'success' });
        setEditDialogOpen(false);
        setSelectedTransaction(null);
        setPage(0); // Pagination'ı sıfırla
        loadTransactions();
      } else {
        setSnackbar({ open: true, message: response.error || 'İşlem güncellenemedi', severity: 'error' });
      }
    } catch (error) {
      console.error('İşlem güncellenirken hata:', error);
      setSnackbar({ open: true, message: 'İşlem güncellenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = () => {
    if (!selectedTransaction) return;
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!selectedTransaction) return;

    setLoading(true);
    try {
      const response = await dbAPI.deleteCheckTransaction(selectedTransaction.id);
      if (response.success) {
        setSnackbar({ open: true, message: 'İşlem başarıyla silindi', severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedTransaction(null);
        setPage(0); // Pagination'ı sıfırla
        loadTransactions();
      } else {
        setSnackbar({ open: true, message: response.error || 'İşlem silinemedi', severity: 'error' });
      }
    } catch (error) {
      console.error('İşlem silinirken hata:', error);
      setSnackbar({ open: true, message: 'İşlem silinirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleProtestCheck = async () => {
    console.log('🔴 handleProtestCheck başladı');
    console.log('selectedTransaction:', selectedTransaction);
    
    if (!selectedTransaction) {
      console.log('❌ selectedTransaction yok!');
      return;
    }

    setLoading(true);
    try {
      console.log('📤 updateCheckTransaction çağrılıyor...');
      console.log('Transaction ID:', selectedTransaction.id);
      console.log('Protest reason:', protestReason);
      
      const updateData = {
        ...selectedTransaction,
        status: 'protested',
        protested_at: new Date().toISOString(),
        protest_reason: protestReason || 'Protesto edildi',
        description: `${selectedTransaction.description || ''} - PROTESTO EDİLDİ${protestReason ? ': ' + protestReason : ''}`.trim(),
      };
      
      console.log('Update data:', updateData);
      
      const response = await dbAPI.updateCheckTransaction(selectedTransaction.id, updateData);
      
      console.log('📥 Response:', response);

      if (response.success) {
        console.log('✅ Protesto başarılı');
        setSnackbar({ 
          open: true, 
          message: `${selectedTransaction.check_type === 'check' ? 'Çek' : 'Senet'} protesto edildi`, 
          severity: 'warning' 
        });
        setProtestDialogOpen(false);
        setProtestReason('');
        setSelectedTransaction(null);
        setPage(0); // Pagination'ı sıfırla
        loadTransactions();
      } else {
        console.log('❌ Protesto başarısız:', response.error);
        setSnackbar({ open: true, message: response.error || 'İşlem güncellenemedi', severity: 'error' });
      }
    } catch (error) {
      console.error('❌ Protesto işlemi hatası:', error);
      setSnackbar({ open: true, message: 'Protesto işlemi sırasında hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
      console.log('🔴 handleProtestCheck bitti');
    }
  };

  const handleCashOut = async () => {
    if (!selectedTransaction || !cashOutAmount || parseFormattedNumber(cashOutAmount) <= 0) {
      setSnackbar({ open: true, message: 'Lütfen geçerli bir tutar girin', severity: 'error' });
      return;
    }

    // Zaten tahsil edilmiş mi kontrol et
    if (selectedTransaction.status === 'collected') {
      setSnackbar({ open: true, message: 'Bu çek/senet zaten tahsil edilmiş!', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const amount = parseFormattedNumber(cashOutAmount);

      // 1. Orijinal çeki "tahsil edildi" olarak işaretle
      const updateResponse = await dbAPI.updateCheckTransaction(selectedTransaction.id, {
        ...selectedTransaction,
        status: 'collected',
        is_cashed: true,
        cashed_at: new Date().toISOString(),
        description: `${selectedTransaction.description || ''} - Tahsil Edildi`.trim(),
      });

      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Çek işaretleme başarısız');
      }

      // 2. Normal kasaya giriş işlemi (in)
      const cashInTransaction = {
        type: 'in' as const,
        amount,
        currency: selectedTransaction.currency,
        category: selectedTransaction.check_type === 'check' ? 'Çek Tahsil' : 'Senet Tahsil',
        description: `${selectedTransaction.check_type === 'check' ? 'Çek' : 'Senet'} Tahsil - Sıra No: ${selectedTransaction.sequence_number || selectedTransaction.check_number || 'Yok'}`,
        reference_type: 'check_cashout',
        reference_id: selectedTransaction.id,
        user: 'Kasa Kullanıcısı',
        date: new Date().toISOString(),
      };

      const cashResponse = await dbAPI.createCashTransaction(cashInTransaction);
      if (!cashResponse.success) {
        throw new Error(cashResponse.error || 'Kasa giriş işlemi başarısız');
      }

      setSnackbar({ 
        open: true, 
        message: `${selectedTransaction.check_type === 'check' ? 'Çek' : 'Senet'} başarıyla tahsil edildi ve kasaya eklendi`, 
        severity: 'success' 
      });

      setCashOutDialogOpen(false);
      setCashOutAmount('');
      setSelectedTransaction(null);
      setPage(0); // Pagination'ı sıfırla
      loadTransactions();

    } catch (error) {
      console.error('Tahsil hatası:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Tahsil işlemi sırasında hata oluştu',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterType, filterCheckType, startDate, endDate, transactions]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Çek-Senet Kasası
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Çek ve senet işlemlerini yönetin ve takip edin
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ReceiptLong sx={{ color: 'primary.main', mr: 1 }} />
              <Typography variant="h6">Toplam Çek</Typography>
            </Box>
            <Typography variant="h5" sx={{ mb: 0.5, color: checkBalanceTRY >= 0 ? 'success.main' : 'error.main' }}>
              ₺{checkBalanceTRY.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Typography>
            {checkBalanceUSD !== 0 && (
              <Typography variant="body2" color="text.secondary">
                ${checkBalanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
            )}
            {checkBalanceEUR !== 0 && (
              <Typography variant="body2" color="text.secondary">
                €{checkBalanceEUR.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ReceiptLong sx={{ color: 'secondary.main', mr: 1 }} />
              <Typography variant="h6">Toplam Senet</Typography>
            </Box>
            <Typography variant="h5" sx={{ mb: 0.5, color: noteBalanceTRY >= 0 ? 'success.main' : 'error.main' }}>
              ₺{noteBalanceTRY.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Typography>
            {noteBalanceUSD !== 0 && (
              <Typography variant="body2" color="text.secondary">
                ${noteBalanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
            )}
            {noteBalanceEUR !== 0 && (
              <Typography variant="body2" color="text.secondary">
                €{noteBalanceEUR.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Transactions Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Son İşlemler ({filteredTransactions.length} / {transactions.length} kayıt)
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenDialog}
            >
              Yeni İşlem
            </Button>
          </Box>

          {/* Filtreler */}
          <Box sx={{ p: 3, pt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Ara (Kimden alındı, müşteri, çek no, banka...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="small"
              sx={{ flex: '1 1 300px', minWidth: '250px' }}
              placeholder="Arama yapın..."
            />
            <TextField
              label="Başlangıç Tarihi"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Bitiş Tarihi"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>İşlem Tipi</InputLabel>
              <Select
                value={filterType}
                label="İşlem Tipi"
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <MenuItem value="all">Tümü</MenuItem>
                <MenuItem value="in">Gelen</MenuItem>
                <MenuItem value="out">Giden</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Çek/Senet</InputLabel>
              <Select
                value={filterCheckType}
                label="Çek/Senet"
                onChange={(e) => setFilterCheckType(e.target.value as any)}
              >
                <MenuItem value="all">Tümü</MenuItem>
                <MenuItem value="check">Çek</MenuItem>
                <MenuItem value="promissory_note">Senet</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Sıra No</TableCell>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell>Tip</TableCell>
                  <TableCell>Çek/Senet No</TableCell>
                  <TableCell>Kimden Alındı</TableCell>
                  <TableCell>Banka</TableCell>
                  <TableCell>Vade</TableCell>
                  <TableCell>Açıklama</TableCell>
                  <TableCell align="right">Tutar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        {transactions.length === 0 
                          ? 'Henüz çek/senet işlemi bulunmuyor'
                          : 'Arama kriterlerine uygun kayıt bulunamadı'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((transaction) => (
                    <TableRow 
                      key={transaction.id} 
                      hover 
                      sx={{ 
                        cursor: 'pointer',
                        bgcolor: transaction.status === 'collected' ? 'success.lighter' : 
                                transaction.status === 'used' ? 'warning.lighter' : 
                                transaction.status === 'protested' ? 'error.lighter' : 'transparent',
                        '&:hover': {
                          bgcolor: transaction.status === 'collected' ? 'success.light' : 
                                  transaction.status === 'used' ? 'warning.light' : 
                                  transaction.status === 'protested' ? 'error.light' : 'action.hover',
                        }
                      }}
                      onClick={() => {
                        console.log('🔍 Seçilen çek detayı:', transaction);
                        console.log('🔍 Çevirme bilgileri:', {
                          is_converted: transaction.is_converted,
                          received_converted_currency: transaction.received_converted_currency,
                          received_converted_amount: transaction.received_converted_amount,
                          given_converted_currency: transaction.given_converted_currency,
                          given_converted_amount: transaction.given_converted_amount
                        });
                        setSelectedTransaction(transaction);
                        setDetailDialogOpen(true);
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {transaction.sequence_number || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDateTime(transaction.created_at)}</TableCell>
                      <TableCell>
                        <Chip
                          label={
                            transaction.status === 'collected' ? 'Tahsil Edildi' :
                            transaction.status === 'used' ? 'Kullanıldı' :
                            transaction.status === 'protested' ? 'PROTESTO' :
                            transaction.type === 'in' ? 'Gelen' : 'Giden'
                          }
                          color={
                            transaction.status === 'collected' ? 'success' :
                            transaction.status === 'used' ? 'warning' :
                            transaction.status === 'protested' ? 'error' :
                            transaction.type === 'in' ? 'info' : 'default'
                          }
                          size="small"
                          icon={
                            transaction.status === 'collected' ? <TrendingUp /> :
                            transaction.status === 'used' ? <TrendingDown /> :
                            transaction.type === 'in' ? <TrendingUp /> : <TrendingDown />
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          <Chip
                            label={transaction.check_type === 'check' ? 'Çek' : 'Senet'}
                            size="small"
                            variant="outlined"
                          />
                          {transaction.is_official === false && (
                            <Chip
                              label="Gayrıresmi"
                              size="small"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{transaction.check_number || '-'}</TableCell>
                      <TableCell>{transaction.received_from || '-'}</TableCell>
                      <TableCell>{transaction.bank_name || '-'}</TableCell>
                      <TableCell>
                        {transaction.due_date ? formatDate(transaction.due_date) : '-'}
                      </TableCell>
                      <TableCell>{transaction.description || '-'}</TableCell>
                      <TableCell align="right">
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {transaction.currency === 'TRY' ? '₺' : transaction.currency === 'EUR' ? '€' : '$'}
                            {Number(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Typography>
                          {transaction.is_converted && transaction.original_amount && transaction.original_currency && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Orijinal: {transaction.original_currency === 'TRY' ? '₺' : transaction.original_currency === 'EUR' ? '€' : '$'}
                              {Number(transaction.original_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={filteredTransactions.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Sayfa başına satır:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          />
        </CardContent>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Çek/Senet İşlemi</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {/* İşlem Tipi */}
            <FormControl fullWidth>
              <InputLabel>İşlem Tipi</InputLabel>
              <Select
                value={transactionType}
                label="İşlem Tipi"
                onChange={(e) => setTransactionType(e.target.value as 'in' | 'out')}
              >
                <MenuItem value="in">Gelen</MenuItem>
                <MenuItem value="out">Giden</MenuItem>
              </Select>
            </FormControl>

            {/* Çek/Senet Tipi ve Tür */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Çek/Senet Tipi</InputLabel>
                <Select
                  value={checkType}
                  label="Çek/Senet Tipi"
                  onChange={(e) => setCheckType(e.target.value as 'check' | 'promissory_note')}
                >
                  <MenuItem value="check">Çek</MenuItem>
                  <MenuItem value="promissory_note">Senet</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Tür</InputLabel>
                <Select
                  value={isOfficial ? 'official' : 'unofficial'}
                  label="Tür"
                  onChange={(e) => setIsOfficial(e.target.value === 'official')}
                >
                  <MenuItem value="official">Resmi</MenuItem>
                  <MenuItem value="unofficial">Gayrıresmi</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Tutar ve Para Birimi */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Tutar"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
                required
              />
              <Box sx={{ minWidth: 120 }}>
                <CurrencySelect
                  value={currency}
                  onChange={setCurrency}
                />
              </Box>
            </Box>

            {/* Detay Alanları */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {checkType === 'check' ? 'Çek' : 'Senet'} Detayları
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label={checkType === 'check' ? 'Çek No' : 'Senet No'}
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="Alındığı Tarih"
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>

              <TextField
                fullWidth
                label="Kimden Alındı"
                value={receivedFrom}
                onChange={(e) => setReceivedFrom(e.target.value)}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="İlk Ciro"
                  value={firstEndorser}
                  onChange={(e) => setFirstEndorser(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="Son Ciro"
                  value={lastEndorser}
                  onChange={(e) => setLastEndorser(e.target.value)}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Bankası"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="Şubesi"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Vade Tarihi"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  fullWidth
                  label="Hesap No"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </Box>
            </Box>

            {/* Açıklama */}
            <TextField
              label="Açıklama"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTransaction?.check_type === 'check' ? 'Çek' : 'Senet'} Detayları
        </DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              {/* Genel Bilgiler */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                  Genel Bilgiler
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Sıra No</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {selectedTransaction.sequence_number || '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Durum</Typography>
                    <Chip
                      label={
                        selectedTransaction.status === 'collected' ? 'Tahsil Edildi' :
                        selectedTransaction.status === 'used' ? 'Kullanıldı' :
                        selectedTransaction.status === 'protested' ? 'PROTESTO' :
                        'Aktif'
                      }
                      color={
                        selectedTransaction.status === 'collected' ? 'success' :
                        selectedTransaction.status === 'used' ? 'warning' :
                        selectedTransaction.status === 'protested' ? 'error' :
                        'default'
                      }
                      size="small"
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">İşlem Tipi</Typography>
                    <Typography variant="body1">
                      {selectedTransaction.type === 'in' ? 'Gelen' : 'Giden'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Tür</Typography>
                    <Chip
                      label={selectedTransaction.is_official === false ? 'Gayrıresmi' : 'Resmi'}
                      size="small"
                      color={selectedTransaction.is_official === false ? 'warning' : 'default'}
                      variant="outlined"
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Tutar</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {selectedTransaction.currency === 'TRY' ? '₺' : selectedTransaction.currency === 'EUR' ? '€' : '$'}
                      {Number(selectedTransaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Kayıt Tarihi</Typography>
                    <Typography variant="body1">{formatDateTime(selectedTransaction.created_at)}</Typography>
                  </Box>
                </Box>
              </Box>

              <Divider />

              {/* Çek/Senet Detayları */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                  {selectedTransaction.check_type === 'check' ? 'Çek' : 'Senet'} Detayları
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {selectedTransaction.check_type === 'check' ? 'Çek' : 'Senet'} No
                    </Typography>
                    <Typography variant="body1">{selectedTransaction.check_number || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Alındığı Tarih</Typography>
                    <Typography variant="body1">
                      {selectedTransaction.received_date ? formatDate(selectedTransaction.received_date) : '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Kimden Alındı</Typography>
                    <Typography variant="body1">{selectedTransaction.received_from || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Vade Tarihi</Typography>
                    <Typography variant="body1">
                      {selectedTransaction.due_date ? formatDate(selectedTransaction.due_date) : '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">İlk Ciro</Typography>
                    <Typography variant="body1">{selectedTransaction.first_endorser || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Son Ciro</Typography>
                    <Typography variant="body1">{selectedTransaction.last_endorser || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Banka</Typography>
                    <Typography variant="body1">{selectedTransaction.bank_name || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Şube</Typography>
                    <Typography variant="body1">{selectedTransaction.branch_name || '-'}</Typography>
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="caption" color="text.secondary">Hesap No</Typography>
                    <Typography variant="body1">{selectedTransaction.account_number || '-'}</Typography>
                  </Box>
                </Box>
              </Box>

              {(selectedTransaction.received_converted_amount || selectedTransaction.given_converted_amount) && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'info.main' }}>
                      Çevrilme Bilgileri
                    </Typography>
                    
                    {/* Çek Tutarı */}
                    <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">Çek Tutarı (Kasada)</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {selectedTransaction.currency === 'TRY' ? '₺' : selectedTransaction.currency === 'EUR' ? '€' : '$'}
                        {Number(selectedTransaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    {/* Alınırken Çevirme */}
                    {selectedTransaction.received_converted_amount && (
                      <Box sx={{ mb: 2 }}>
                        <Alert severity="success" sx={{ mb: 1 }}>
                          Bu çek/senet müşteriden alınırken farklı bir para birimine çevrilerek müşteri hesabından düşülmüştür.
                        </Alert>
                        <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">Alınırken Çevrilen Tutar</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.dark' }}>
                            {selectedTransaction.received_converted_currency === 'TRY' ? '₺' : selectedTransaction.received_converted_currency === 'EUR' ? '€' : '$'}
                            {Number(selectedTransaction.received_converted_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Müşteri hesabından {selectedTransaction.received_converted_currency} cinsinden düşülmüştür
                          </Typography>
                          {/* Kur Hesaplaması */}
                          <Box sx={{ mt: 1.5, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px dashed', borderColor: 'success.main' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              Kur Hesaplaması:
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              1 {selectedTransaction.received_converted_currency} = {(Number(selectedTransaction.amount) / Number(selectedTransaction.received_converted_amount)).toFixed(4)} {selectedTransaction.currency}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              ({selectedTransaction.currency === 'TRY' ? '₺' : selectedTransaction.currency === 'EUR' ? '€' : '$'}{Number(selectedTransaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ÷ {selectedTransaction.received_converted_currency === 'TRY' ? '₺' : selectedTransaction.received_converted_currency === 'EUR' ? '€' : '$'}{Number(selectedTransaction.received_converted_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}

                    {/* Verirken Çevirme */}
                    {selectedTransaction.given_converted_amount && (
                      <Box>
                        <Alert severity="warning" sx={{ mb: 1 }}>
                          Bu çek/senet tedarikçiye verirken farklı bir para birimine çevrilerek tedarikçi hesabına eklenmiştir.
                        </Alert>
                        <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">Verirken Çevrilen Tutar</Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                            {selectedTransaction.given_converted_currency === 'TRY' ? '₺' : selectedTransaction.given_converted_currency === 'EUR' ? '€' : '$'}
                            {Number(selectedTransaction.given_converted_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            Tedarikçi hesabına {selectedTransaction.given_converted_currency} cinsinden eklenmiştir
                          </Typography>
                          {/* Kur Hesaplaması */}
                          <Box sx={{ mt: 1.5, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px dashed', borderColor: 'warning.main' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              Kur Hesaplaması:
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              1 {selectedTransaction.given_converted_currency} = {(Number(selectedTransaction.amount) / Number(selectedTransaction.given_converted_amount)).toFixed(4)} {selectedTransaction.currency}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              ({selectedTransaction.currency === 'TRY' ? '₺' : selectedTransaction.currency === 'EUR' ? '€' : '$'}{Number(selectedTransaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ÷ {selectedTransaction.given_converted_currency === 'TRY' ? '₺' : selectedTransaction.given_converted_currency === 'EUR' ? '€' : '$'}{Number(selectedTransaction.given_converted_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </>
              )}

              {selectedTransaction.status === 'protested' && selectedTransaction.protest_reason && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: 'error.main' }}>
                      Protesto Bilgileri
                    </Typography>
                    <Alert severity="error" sx={{ mb: 2 }}>
                      Bu çek/senet protesto edilmiştir ve ödenmemiştir.
                    </Alert>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Protesto Tarihi</Typography>
                        <Typography variant="body1">
                          {selectedTransaction.protested_at ? formatDateTime(selectedTransaction.protested_at) : '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <Typography variant="caption" color="text.secondary">Protesto Nedeni</Typography>
                        <Typography variant="body1">{selectedTransaction.protest_reason}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </>
              )}

              {selectedTransaction.description && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                      Açıklama
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedTransaction.description}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {selectedTransaction?.is_converted && (
                <Chip 
                  label="Çevrildi" 
                  color="info" 
                  icon={<SwapHoriz />}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                color="error"
                onClick={() => {
                  setDetailDialogOpen(false);
                  handleDeleteTransaction();
                }}
              >
                Sil
              </Button>
              <Button 
                onClick={() => {
                  setDetailDialogOpen(false);
                  handleEditTransaction();
                }}
              >
                Düzenle
              </Button>
              {selectedTransaction?.type === 'in' && (selectedTransaction?.status === 'active' || selectedTransaction?.status === 'protested') && (
                <Button 
                  variant="contained" 
                  color="success"
                  onClick={() => {
                    setCashOutAmount(formatNumberWithCommas(selectedTransaction.amount.toString()));
                    setCashOutDialogOpen(true);
                    setDetailDialogOpen(false);
                  }}
                >
                  Tahsil Et
                </Button>
              )}
              {selectedTransaction?.type === 'in' && (selectedTransaction?.status === 'active' || selectedTransaction?.status === 'protested') && (
                <Button 
                  variant="outlined" 
                  color="error"
                  onClick={() => {
                    console.log('🔵 Protesto butonu tıklandı');
                    console.log('selectedTransaction:', selectedTransaction);
                    setProtestDialogOpen(true);
                    setDetailDialogOpen(false);
                  }}
                >
                  {selectedTransaction?.status === 'protested' ? 'Protesto Güncelle' : 'Protesto Et'}
                </Button>
              )}
              <Button onClick={() => setDetailDialogOpen(false)}>Kapat</Button>
            </Box>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Cash Out Dialog */}
      <Dialog open={cashOutDialogOpen} onClose={() => setCashOutDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedTransaction?.check_type === 'check' ? 'Çek' : 'Senet'} Bozdur
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Alert severity="info">
              Bu işlem {selectedTransaction?.check_type === 'check' ? 'çeki' : 'senedi'} bozdurarak kasaya para ekleyecektir.
            </Alert>
            
            <Box>
              <Typography variant="caption" color="text.secondary">
                {selectedTransaction?.check_type === 'check' ? 'Çek' : 'Senet'} Bilgileri
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {selectedTransaction?.check_number || 'No yok'} - {selectedTransaction?.received_from || 'Bilinmiyor'}
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="Tahsil Tutarı"
              value={cashOutAmount}
              onChange={(e) => setCashOutAmount(formatNumberWithCommas(e.target.value))}
              helperText={`Orijinal tutar: ${selectedTransaction?.currency === 'TRY' ? '₺' : selectedTransaction?.currency === 'EUR' ? '€' : '$'}${Number(selectedTransaction?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            />

            <TextField
              fullWidth
              label="Açıklama (Opsiyonel)"
              multiline
              rows={2}
              placeholder="Tahsil ile ilgili notlar..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCashOutDialogOpen(false)}>İptal</Button>
          <Button 
            onClick={handleCashOut} 
            variant="contained" 
            color="success"
            disabled={loading || !cashOutAmount || parseFormattedNumber(cashOutAmount) <= 0}
          >
            {loading ? 'İşleniyor...' : 'Tahsil Et'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Çek/Senet Düzenle</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {/* İşlem Tipi */}
            <FormControl fullWidth>
              <InputLabel>İşlem Tipi</InputLabel>
              <Select
                value={transactionType}
                label="İşlem Tipi"
                onChange={(e) => setTransactionType(e.target.value as 'in' | 'out')}
              >
                <MenuItem value="in">Gelen</MenuItem>
                <MenuItem value="out">Giden</MenuItem>
              </Select>
            </FormControl>

            {/* Çek/Senet Tipi ve Tür */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Çek/Senet Tipi</InputLabel>
                <Select
                  value={checkType}
                  label="Çek/Senet Tipi"
                  onChange={(e) => setCheckType(e.target.value as 'check' | 'promissory_note')}
                >
                  <MenuItem value="check">Çek</MenuItem>
                  <MenuItem value="promissory_note">Senet</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Tür</InputLabel>
                <Select
                  value={isOfficial ? 'official' : 'unofficial'}
                  label="Tür"
                  onChange={(e) => setIsOfficial(e.target.value === 'official')}
                >
                  <MenuItem value="official">Resmi</MenuItem>
                  <MenuItem value="unofficial">Gayrıresmi</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Tutar ve Para Birimi */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Tutar"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
                required
              />
              <Box sx={{ minWidth: 120 }}>
                <CurrencySelect
                  value={currency}
                  onChange={setCurrency}
                />
              </Box>
            </Box>

            {/* Detay Alanları */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {checkType === 'check' ? 'Çek' : 'Senet'} Detayları
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label={checkType === 'check' ? 'Çek No' : 'Senet No'}
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="Alındığı Tarih"
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>

              <TextField
                fullWidth
                label="Kimden Alındı"
                value={receivedFrom}
                onChange={(e) => setReceivedFrom(e.target.value)}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="İlk Ciro"
                  value={firstEndorser}
                  onChange={(e) => setFirstEndorser(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="Son Ciro"
                  value={lastEndorser}
                  onChange={(e) => setLastEndorser(e.target.value)}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Bankası"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
                <TextField
                  fullWidth
                  label="Şubesi"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Vade Tarihi"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  fullWidth
                  label="Hesap No"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </Box>
            </Box>

            <TextField
              label="Açıklama"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>İptal</Button>
          <Button onClick={handleUpdateTransaction} variant="contained" disabled={loading}>
            {loading ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>İşlemi Sil</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Bu işlemi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </Alert>
          {selectedTransaction && (
            <Box>
              <Typography variant="body2">
                <strong>Tip:</strong> {selectedTransaction.check_type === 'check' ? 'Çek' : 'Senet'}
              </Typography>
              <Typography variant="body2">
                <strong>No:</strong> {selectedTransaction.check_number || '-'}
              </Typography>
              <Typography variant="body2">
                <strong>Tutar:</strong> {selectedTransaction.currency === 'TRY' ? '₺' : selectedTransaction.currency === 'EUR' ? '€' : '$'}
                {Number(selectedTransaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button onClick={confirmDeleteTransaction} color="error" variant="contained" disabled={loading}>
            {loading ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Protest Dialog */}
      <Dialog 
        open={protestDialogOpen} 
        onClose={() => {
          console.log('🔵 Protesto dialog kapatılıyor');
          setProtestDialogOpen(false);
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {selectedTransaction?.check_type === 'check' ? 'Çek' : 'Senet'} Protesto Et
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Alert severity="warning">
              Bu işlem {selectedTransaction?.check_type === 'check' ? 'çekin' : 'senedin'} ödenmediğini işaretleyecektir.
              Protesto durumu sadece bilgilendirme amaçlıdır, çek/senet yine de kullanılabilir.
            </Alert>
            
            <Box>
              <Typography variant="caption" color="text.secondary">
                {selectedTransaction?.check_type === 'check' ? 'Çek' : 'Senet'} Bilgileri
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Sıra No: {selectedTransaction?.sequence_number || '-'}
              </Typography>
              <Typography variant="body2">
                {selectedTransaction?.check_number || 'No yok'} - {selectedTransaction?.received_from || 'Bilinmiyor'}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main', mt: 1 }}>
                Tutar: {selectedTransaction?.currency === 'TRY' ? '₺' : selectedTransaction?.currency === 'EUR' ? '€' : '$'}
                {Number(selectedTransaction?.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="Protesto Nedeni"
              multiline
              rows={3}
              value={protestReason}
              onChange={(e) => setProtestReason(e.target.value)}
              placeholder="Karşılıksız, imza uyuşmazlığı, vb..."
              helperText="Protesto nedenini belirtiniz (opsiyonel)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setProtestDialogOpen(false);
            setProtestReason('');
          }}>
            İptal
          </Button>
          <Button 
            onClick={() => {
              console.log('🟢 Protesto Et butonu tıklandı (dialog içinde)');
              handleProtestCheck();
            }} 
            variant="contained" 
            color="error"
            disabled={loading}
          >
            {loading ? 'İşleniyor...' : 'Protesto Et'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CheckManagement;
