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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from '@mui/material';
import {
  Assessment,
  Download,
  Print,
  AttachMoney,
  AccountBalanceWallet,
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import Pagination from './common/Pagination';

interface SaleReport {
  date: string;
  customerName: string;
  productName: string;
  quantity: number;
  unit: 'desi' | 'ayak';
  quantityInDesi: number;
  unitPrice: number;
  total: number;
  currency: string;
}

const Reports: React.FC = () => {
  // Bu ayın ilk ve son günü
  const getThisMonthDates = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      start: firstDay.toISOString().split('T')[0],
      end: lastDay.toISOString().split('T')[0]
    };
  };

  const thisMonth = getThisMonthDates();

  const [reportType, setReportType] = useState('income'); // income, expense, net
  const [startDate, setStartDate] = useState(thisMonth.start);
  const [endDate, setEndDate] = useState(thisMonth.end);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SaleReport[]>([]);
  const [purchasesData, setPurchasesData] = useState<any[]>([]);
  const [supplierPaymentsData, setSupplierPaymentsData] = useState<any[]>([]);
  const [cashIncomeData, setCashIncomeData] = useState<any[]>([]); // Kasa girişleri
  const [cashBalance, setCashBalance] = useState({ TRY: 0, USD: 0, EUR: 0 });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Satış verilerini yükle
  const loadSalesData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dbAPI.getSales(startDate, endDate);
      if (response.success && response.data) {
        // Veriyi uygun formata dönüştür
        const formattedData: SaleReport[] = response.data.map((row: any) => ({
          date: row.sale_date || new Date().toISOString(),
          customerName: row.customer_name || row.name || 'Bilinmeyen Müşteri',
          productName: `${row.category || 'Ürün'} - ${row.color || 'Renk'}`,
          quantity: Number(row.quantity_pieces || row.quantity || 0), // Adet cinsinden
          unit: 'desi' as const,
          quantityInDesi: Number(row.quantity_desi || row.quantity || 0), // Desi cinsinden
          unitPrice: Number(row.unit_price_per_desi || row.unit_price || 0),
          total: Number(row.total_price || row.total_amount || 0),
          currency: row.currency || 'TRY',
        }));
        setSalesData(formattedData);
      } else {
        setSalesData([]);
        setError(response.error || 'Veriler yüklenemedi');
      }
    } catch (error) {
      setSalesData([]);
      setError('Veriler yüklenirken hata oluştu');
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Alım verilerini yükle
  const loadPurchasesData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await dbAPI.getPurchases();
      if (response.success && response.data) {
        // Tarih filtresini uygula
        const filtered = response.data.filter((purchase: any) => {
          const purchaseDate = new Date(purchase.purchase_date || purchase.date || purchase.created_at);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return purchaseDate >= start && purchaseDate <= end;
        });
        setPurchasesData(filtered);
      } else {
        setPurchasesData([]);
        setError(response.error || 'Veriler yüklenemedi');
      }
    } catch (error) {
      setPurchasesData([]);
      setError('Veriler yüklenirken hata oluştu');
      console.error('Error loading purchases data:', error);
    } finally {
      setLoading(false);
    }
  };



  // Kasa çıkışlarını yükle (GİDER - TÜM OUT işlemleri)
  const loadSupplierPaymentsData = async () => {
    try {
      // Kasa işlemlerinden TÜM çıkışları al
      const response = await dbAPI.getCashTransactions();
      if (response.success && response.data) {
        // Sadece gider (out) işlemlerini al - HİÇBİR FİLTRE YOK
        const filtered = response.data.filter((transaction: any) => {
          const transactionDate = new Date(transaction.created_at);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return transaction.type === 'out' && 
                 transactionDate >= start && 
                 transactionDate <= end;
        });
        setSupplierPaymentsData(filtered);
      } else {
        setSupplierPaymentsData([]);
      }
    } catch (error) {
      setSupplierPaymentsData([]);
      console.error('Error loading supplier payments data:', error);
    }
  };

  // Kasa girişlerini yükle (GELİR - TÜM IN işlemleri)
  const loadCashIncome = async () => {
    try {
      const response = await dbAPI.getCashTransactions();
      if (response.success && response.data) {
        // Sadece IN işlemleri - HİÇBİR FİLTRE YOK
        const filtered = response.data.filter((t: any) => {
          const transactionDate = new Date(t.created_at);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return t.type === 'in' && 
                 transactionDate >= start && 
                 transactionDate <= end;
        });
        setCashIncomeData(filtered);
      }
    } catch (error) {
      console.error('Error loading cash income:', error);
    }
  };

  // Kasa bakiyesini hesapla (TÜM ZAMANLAR)
  const loadCashBalance = async () => {
    try {
      const response = await dbAPI.getCashTransactions();
      if (response.success && response.data) {
        const balance = { TRY: 0, USD: 0, EUR: 0 };
        response.data.forEach((t: any) => {
          const currency = (t.currency || 'TRY') as 'TRY' | 'USD' | 'EUR';
          const amount = Number(t.amount) || 0;
          if (t.type === 'in') {
            balance[currency] += amount;
          } else {
            balance[currency] -= amount;
          }
        });
        setCashBalance(balance);
      }
    } catch (error) {
      console.error('Error loading cash balance:', error);
    }
  };

  useEffect(() => {
    loadSalesData();
    loadPurchasesData();
    loadCashIncome(); // Kasa girişlerini yükle (GELİR)
    loadSupplierPaymentsData(); // Kasa çıkışlarını yükle (GİDER)
    loadCashBalance();
    setCurrentPage(1); // Tarih değişince sayfa 1'e dön
  }, [startDate, endDate]);

  // Gelir istatistikleri (SADECE Kasa Girişleri - Para Çevirme Hariç)
  const incomeStats = {
    totalPayments: cashIncomeData?.length || 0,
    totalRevenueTRY: cashIncomeData?.filter((p: any) => (p.currency || 'TRY') === 'TRY').reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0) || 0,
    totalRevenueUSD: cashIncomeData?.filter((p: any) => (p.currency || 'TRY') === 'USD').reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0) || 0,
    totalRevenueEUR: cashIncomeData?.filter((p: any) => (p.currency || 'TRY') === 'EUR').reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0) || 0,
  };

  // Gider istatistikleri (SADECE Kasa Çıkışları - Para Çevirme Hariç)
  const expenseStats = {
    totalPayments: supplierPaymentsData?.length || 0,
    totalExpenseTRY: supplierPaymentsData?.filter((p: any) => (p.currency || 'TRY') === 'TRY').reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0) || 0,
    totalExpenseUSD: supplierPaymentsData?.filter((p: any) => (p.currency || 'TRY') === 'USD').reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0) || 0,
    totalExpenseEUR: supplierPaymentsData?.filter((p: any) => (p.currency || 'TRY') === 'EUR').reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0) || 0,
  };

  // Net kar/zarar
  const netStats = {
    netTRY: incomeStats.totalRevenueTRY - expenseStats.totalExpenseTRY,
    netUSD: incomeStats.totalRevenueUSD - expenseStats.totalExpenseUSD,
    netEUR: incomeStats.totalRevenueEUR - expenseStats.totalExpenseEUR,
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Finansal Raporlar
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Gelir, gider ve net kar/zarar raporlarını görüntüleyin
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Rapor Tipi</InputLabel>
                <Select
                  value={reportType}
                  label="Rapor Tipi"
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <MenuItem value="income">Gelir Raporu</MenuItem>
                  <MenuItem value="expense">Gider Raporu</MenuItem>
                  <MenuItem value="net">Net Kar/Zarar</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid xs={12} md={3}>
              <TextField
                fullWidth
                label="Başlangıç Tarihi"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid xs={12} md={3}>
              <TextField
                fullWidth
                label="Bitiş Tarihi"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => {
                    // TODO: Excel export
                  }}
                >
                  Excel
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={() => {
                    window.print();
                  }}
                >
                  Yazdır
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {reportType === 'income' && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Assessment sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="h6">Toplam Satış</Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1 }}>
                  {incomeStats.totalPayments}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  adet işlem
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AttachMoney sx={{ color: 'success.main', mr: 1 }} />
                  <Typography variant="h6">Gelir (TL)</Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1 }}>
                  ₺{(incomeStats.totalRevenueTRY || 0).toLocaleString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AttachMoney sx={{ color: 'info.main', mr: 1 }} />
                  <Typography variant="h6">Gelir (USD)</Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1 }}>
                  ${(incomeStats.totalRevenueUSD || 0).toLocaleString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AttachMoney sx={{ color: 'warning.main', mr: 1 }} />
                  <Typography variant="h6">Gelir (EUR)</Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1 }}>
                  €{(incomeStats.totalRevenueEUR || 0).toLocaleString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {reportType === 'expense' && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Assessment sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="h6">Toplam Alım</Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1 }}>
                  {expenseStats.totalPayments}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  adet işlem
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AttachMoney sx={{ color: 'error.main', mr: 1 }} />
                  <Typography variant="h6">Gider (TL)</Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1 }}>
                  ₺{(expenseStats.totalExpenseTRY || 0).toLocaleString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AttachMoney sx={{ color: 'error.main', mr: 1 }} />
                  <Typography variant="h6">Gider (USD)</Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1 }}>
                  ${(expenseStats.totalExpenseUSD || 0).toLocaleString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AttachMoney sx={{ color: 'error.main', mr: 1 }} />
                  <Typography variant="h6">Gider (EUR)</Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1 }}>
                  €{(expenseStats.totalExpenseEUR || 0).toLocaleString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {reportType === 'net' && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AttachMoney sx={{ color: netStats.netTRY >= 0 ? 'success.main' : 'error.main', mr: 1 }} />
                  <Typography variant="h6">Net (TL)</Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1, color: netStats.netTRY >= 0 ? 'success.main' : 'error.main' }}>
                  ₺{(netStats.netTRY || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gelir: ₺{incomeStats.totalRevenueTRY.toLocaleString('tr-TR')} | Gider: ₺{expenseStats.totalExpenseTRY.toLocaleString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AttachMoney sx={{ color: netStats.netUSD >= 0 ? 'success.main' : 'error.main', mr: 1 }} />
                  <Typography variant="h6">Net (USD)</Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1, color: netStats.netUSD >= 0 ? 'success.main' : 'error.main' }}>
                  ${(netStats.netUSD || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gelir: ${incomeStats.totalRevenueUSD.toLocaleString('tr-TR')} | Gider: ${expenseStats.totalExpenseUSD.toLocaleString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AttachMoney sx={{ color: netStats.netEUR >= 0 ? 'success.main' : 'error.main', mr: 1 }} />
                  <Typography variant="h6">Net (EUR)</Typography>
                </Box>
                <Typography variant="h4" sx={{ mb: 1, color: netStats.netEUR >= 0 ? 'success.main' : 'error.main' }}>
                  €{(netStats.netEUR || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gelir: €{incomeStats.totalRevenueEUR.toLocaleString('tr-TR')} | Gider: €{expenseStats.totalExpenseEUR.toLocaleString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Income Table */}
      {reportType === 'income' && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Gelir Detayları (Kasa Girişleri)
            </Typography>
            <TableContainer>
              <Table sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '15%' }}>Tarih</TableCell>
                    <TableCell sx={{ width: '20%' }}>Kategori</TableCell>
                    <TableCell sx={{ width: '45%' }}>Açıklama</TableCell>
                    <TableCell align="right" sx={{ width: '20%' }}>Tutar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedData = (cashIncomeData || []).slice(startIndex, endIndex);
                    return paginatedData.map((transaction: any, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {transaction?.created_at ? new Date(transaction.created_at).toLocaleDateString('tr-TR') : '-'}
                        </TableCell>
                        <TableCell>{transaction?.category || 'Genel Gelir'}</TableCell>
                        <TableCell>{transaction?.description || '-'}</TableCell>
                        <TableCell align="right">
                          {(transaction?.currency || 'TRY') === 'USD' ? '$' : (transaction?.currency || 'TRY') === 'EUR' ? '€' : '₺'}
                          {(Number(transaction?.amount) || 0).toLocaleString('tr-TR')}
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                  {cashIncomeData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        {loading ? 'Yükleniyor...' : 'Veri bulunamadı'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination */}
            {cashIncomeData.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(cashIncomeData.length / itemsPerPage)}
                totalItems={cashIncomeData.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Expense Table */}
      {reportType === 'expense' && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Gider Detayları (Kasa Çıkışları)
            </Typography>
            <TableContainer>
              <Table sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '15%' }}>Tarih</TableCell>
                    <TableCell sx={{ width: '20%' }}>Kategori</TableCell>
                    <TableCell sx={{ width: '45%' }}>Açıklama</TableCell>
                    <TableCell align="right" sx={{ width: '20%' }}>Tutar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedData = (supplierPaymentsData || []).slice(startIndex, endIndex);
                    return paginatedData.map((transaction: any, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {transaction?.created_at ? new Date(transaction.created_at).toLocaleDateString('tr-TR') : '-'}
                        </TableCell>
                        <TableCell>{transaction?.category || 'Genel Gider'}</TableCell>
                        <TableCell>{transaction?.description || '-'}</TableCell>
                        <TableCell align="right">
                          {(transaction?.currency || 'TRY') === 'USD' ? '$' : (transaction?.currency || 'TRY') === 'EUR' ? '€' : '₺'}
                          {(Number(transaction?.amount) || 0).toLocaleString('tr-TR')}
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                  {supplierPaymentsData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        {loading ? 'Yükleniyor...' : 'Veri bulunamadı'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination */}
            {supplierPaymentsData.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(supplierPaymentsData.length / itemsPerPage)}
                totalItems={supplierPaymentsData.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Net Table */}
      {reportType === 'net' && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Net Kar/Zarar Özeti
            </Typography>
            <TableContainer>
              <Table sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '25%' }}>Para Birimi</TableCell>
                    <TableCell align="right" sx={{ width: '25%' }}>Toplam Gelir</TableCell>
                    <TableCell align="right" sx={{ width: '25%' }}>Toplam Gider</TableCell>
                    <TableCell align="right" sx={{ width: '25%' }}>Net Kar/Zarar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><strong>TRY (₺)</strong></TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      ₺{incomeStats.totalRevenueTRY.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      ₺{expenseStats.totalExpenseTRY.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell align="right" sx={{ color: netStats.netTRY >= 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                      ₺{netStats.netTRY.toLocaleString('tr-TR')}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>USD ($)</strong></TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      ${incomeStats.totalRevenueUSD.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      ${expenseStats.totalExpenseUSD.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell align="right" sx={{ color: netStats.netUSD >= 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                      ${netStats.netUSD.toLocaleString('tr-TR')}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>EUR (€)</strong></TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>
                      €{incomeStats.totalRevenueEUR.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      €{expenseStats.totalExpenseEUR.toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell align="right" sx={{ color: netStats.netEUR >= 0 ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                      €{netStats.netEUR.toLocaleString('tr-TR')}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Kasa Bakiyesi Kartı - Net tablosunda göster */}
      {reportType === 'net' && (
        <Card sx={{ mt: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceWallet />
              Güncel Kasa Bakiyesi (Tüm Zamanlar)
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Bu bakiye, başlangıçtan bugüne kadar olan tüm kasa işlemlerinin toplamıdır.
            </Alert>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card sx={{ background: cashBalance.TRY >= 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                  <CardContent>
                    <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                      TRY Bakiye
                    </Typography>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                      ₺{cashBalance.TRY.toLocaleString('tr-TR')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ background: cashBalance.USD >= 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                  <CardContent>
                    <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                      USD Bakiye
                    </Typography>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                      ${cashBalance.USD.toLocaleString('tr-TR')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ background: cashBalance.EUR >= 0 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                  <CardContent>
                    <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                      EUR Bakiye
                    </Typography>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', mt: 1 }}>
                      €{cashBalance.EUR.toLocaleString('tr-TR')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Reports;