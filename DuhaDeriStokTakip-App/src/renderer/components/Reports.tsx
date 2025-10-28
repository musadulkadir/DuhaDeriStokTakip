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
} from '@mui/icons-material';
import { dbAPI } from '../services/api';

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

  useEffect(() => {
    loadSalesData();
    loadPurchasesData();
  }, [startDate, endDate]);

  // Gelir istatistikleri (Satışlar)
  const incomeStats = {
    totalSales: salesData?.length || 0,
    totalRevenueTRY: salesData?.filter(sale => sale.currency === 'TRY').reduce((sum, sale) => sum + (Number(sale?.total) || 0), 0) || 0,
    totalRevenueUSD: salesData?.filter(sale => sale.currency === 'USD').reduce((sum, sale) => sum + (Number(sale?.total) || 0), 0) || 0,
    totalRevenueEUR: salesData?.filter(sale => sale.currency === 'EUR').reduce((sum, sale) => sum + (Number(sale?.total) || 0), 0) || 0,
  };

  // Gider istatistikleri (Alımlar)
  const expenseStats = {
    totalPurchases: purchasesData?.length || 0,
    totalExpenseTRY: purchasesData?.filter((p: any) => p.currency === 'TRY').reduce((sum: number, p: any) => sum + (Number(p?.total_amount) || 0), 0) || 0,
    totalExpenseUSD: purchasesData?.filter((p: any) => p.currency === 'USD').reduce((sum: number, p: any) => sum + (Number(p?.total_amount) || 0), 0) || 0,
    totalExpenseEUR: purchasesData?.filter((p: any) => p.currency === 'EUR').reduce((sum: number, p: any) => sum + (Number(p?.total_amount) || 0), 0) || 0,
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
                  {incomeStats.totalSales}
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
                  {expenseStats.totalPurchases}
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
              Gelir Detayları (Satışlar)
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tarih</TableCell>
                    <TableCell>Müşteri</TableCell>
                    <TableCell>Ürün</TableCell>
                    <TableCell align="right">Miktar</TableCell>
                    <TableCell align="right">Birim Fiyat</TableCell>
                    <TableCell align="right">Toplam</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(salesData || []).map((sale, index) => (
                    <TableRow key={index}>
                      <TableCell>{sale?.date ? new Date(sale.date).toLocaleDateString('tr-TR') : '-'}</TableCell>
                      <TableCell>{sale?.customerName || '-'}</TableCell>
                      <TableCell>{sale?.productName || '-'}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {(sale?.quantity || 0).toLocaleString('tr-TR')} adet
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                          {(sale?.quantityInDesi || 0).toLocaleString('tr-TR')} desi
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {sale?.currency === 'USD' ? '$' : sale?.currency === 'EUR' ? '€' : '₺'}
                        {(sale?.unitPrice || 0).toLocaleString('tr-TR')}
                      </TableCell>
                      <TableCell align="right">
                        {sale?.currency === 'USD' ? '$' : sale?.currency === 'EUR' ? '€' : '₺'}
                        {(sale?.total || 0).toLocaleString('tr-TR')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {salesData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        {loading ? 'Yükleniyor...' : 'Veri bulunamadı'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Expense Table */}
      {reportType === 'expense' && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Gider Detayları (Alımlar)
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Tarih</TableCell>
                    <TableCell>Tedarikçi</TableCell>
                    <TableCell>Açıklama</TableCell>
                    <TableCell align="right">Toplam</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(purchasesData || []).map((purchase: any, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {purchase?.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString('tr-TR') : '-'}
                      </TableCell>
                      <TableCell>{purchase?.supplier_name || 'Bilinmeyen Tedarikçi'}</TableCell>
                      <TableCell>{purchase?.notes || 'Malzeme alımı'}</TableCell>
                      <TableCell align="right">
                        {purchase?.currency === 'USD' ? '$' : purchase?.currency === 'EUR' ? '€' : '₺'}
                        {(Number(purchase?.total_amount) || 0).toLocaleString('tr-TR')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {purchasesData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        {loading ? 'Yükleniyor...' : 'Veri bulunamadı'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
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
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Para Birimi</TableCell>
                    <TableCell align="right">Toplam Gelir</TableCell>
                    <TableCell align="right">Toplam Gider</TableCell>
                    <TableCell align="right">Net Kar/Zarar</TableCell>
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
    </Box>
  );
};

export default Reports;