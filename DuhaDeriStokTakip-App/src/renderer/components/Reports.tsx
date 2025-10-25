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
  TrendingUp,
  Inventory,
  Download,
  Print,
  AttachMoney,
} from '@mui/icons-material';
import Pagination from './common/Pagination';
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
  const [reportType, setReportType] = useState('sales');
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-12-31');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<SaleReport[]>([]);

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
          quantity: row.quantity_pieces || row.quantity || 0, // Adet cinsinden
          unit: 'desi' as const,
          quantityInDesi: row.quantity_desi || row.quantity || 0, // Desi cinsinden
          unitPrice: row.unit_price_per_desi || row.unit_price || 0,
          total: row.total_price || row.total_amount || 0,
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

  useEffect(() => {
    if (reportType === 'sales') {
      loadSalesData();
    }
  }, [reportType, startDate, endDate]);

  // Toplam satış istatistikleri
  const stats = {
    totalSales: salesData?.length || 0,
    totalRevenueTRY: salesData?.filter(sale => sale.currency === 'TRY').reduce((sum, sale) => sum + (sale?.total || 0), 0) || 0,
    totalRevenueUSD: salesData?.filter(sale => sale.currency === 'USD').reduce((sum, sale) => sum + (sale?.total || 0), 0) || 0,
    totalQuantityDesi: salesData?.reduce((sum, sale) => sum + (sale?.quantityInDesi || 0), 0) || 0,
    totalQuantityPieces: salesData?.reduce((sum, sale) => sum + (sale?.quantity || 0), 0) || 0,
    totalQuantityAyak: Math.round((salesData?.reduce((sum, sale) => sum + (sale?.quantityInDesi || 0), 0) || 0) / 10 * 100) / 100, // 10 desi = 1 ayak
    averageOrderValueTRY: salesData?.filter(sale => sale.currency === 'TRY').length > 0 ? 
      (salesData?.filter(sale => sale.currency === 'TRY').reduce((sum, sale) => sum + (sale?.total || 0), 0) || 0) / salesData.filter(sale => sale.currency === 'TRY').length : 0,
    averageOrderValueUSD: salesData?.filter(sale => sale.currency === 'USD').length > 0 ? 
      (salesData?.filter(sale => sale.currency === 'USD').reduce((sum, sale) => sum + (sale?.total || 0), 0) || 0) / salesData.filter(sale => sale.currency === 'USD').length : 0,
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Raporlar
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Satış ve stok raporlarını görüntüleyin
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
                  <MenuItem value="sales">Satış Raporu</MenuItem>
                  <MenuItem value="stock">Stok Raporu</MenuItem>
                  <MenuItem value="customer">Müşteri Raporu</MenuItem>
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
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assessment sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6">Toplam Satış</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {stats.totalSales}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                adet işlem
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6">Gelir (TL)</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                ₺{(stats.totalRevenueTRY || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ortalama ₺{(stats.averageOrderValueTRY || 0).toLocaleString()}/satış
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney sx={{ color: 'info.main', mr: 1 }} />
                <Typography variant="h6">Gelir (USD)</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                ${(stats.totalRevenueUSD || 0).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ortalama ${(stats.averageOrderValueUSD || 0).toLocaleString()}/satış
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Inventory sx={{ color: 'warning.main', mr: 1 }} />
                <Typography variant="h6">Toplam Miktar</Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {(stats.totalQuantityDesi || 0).toLocaleString('tr-TR')} desi
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {(stats.totalQuantityAyak || 0).toLocaleString('tr-TR')} ayak • {(stats.totalQuantityPieces || 0).toLocaleString('tr-TR')} adet
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Sales Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Satış Detayları
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
                        {(sale?.quantityInDesi || 0).toLocaleString('tr-TR')} desi ({Math.round((sale?.quantityInDesi || 0) / 10 * 100) / 100} ayak)
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{sale?.currency === 'USD' ? '$' : '₺'}{(sale?.unitPrice || 0).toLocaleString('tr-TR')}/{sale?.unit || 'desi'}</TableCell>
                    <TableCell align="right">{sale?.currency === 'USD' ? '$' : '₺'}{(sale?.total || 0).toLocaleString()}</TableCell>
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
    </Box>
  );
};

export default Reports;