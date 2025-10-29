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
  PictureAsPdf,
  AttachMoney,
  AccountBalanceWallet,
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import Pagination from './common/Pagination';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  // Excel export fonksiyonu
  const handleExportToExcel = () => {
    try {
      // Dinamik import ile xlsx kütüphanesini yükle
      import('xlsx').then((XLSX) => {
        const wb = XLSX.utils.book_new();

        if (reportType === 'income') {
          // Gelir raporu
          const data = cashIncomeData.map((t: any) => ({
            'Tarih': t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR') : '-',
            'Kategori': t.category || '-',
            'Açıklama': t.description || '-',
            'Para Birimi': t.currency || 'TRY',
            'Tutar': Number(t.amount) || 0,
          }));

          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, 'Gelir Raporu');

        } else if (reportType === 'expense') {
          // Gider raporu
          const data = supplierPaymentsData.map((t: any) => ({
            'Tarih': t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR') : '-',
            'Kategori': t.category || '-',
            'Açıklama': t.description || '-',
            'Para Birimi': t.currency || 'TRY',
            'Tutar': Number(t.amount) || 0,
          }));

          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, 'Gider Raporu');

        } else if (reportType === 'net') {
          // Net kar/zarar raporu
          const data = [
            {
              'Para Birimi': 'TRY (₺)',
              'Toplam Gelir': incomeStats.totalRevenueTRY,
              'Toplam Gider': expenseStats.totalExpenseTRY,
              'Net Kar/Zarar': incomeStats.totalRevenueTRY - expenseStats.totalExpenseTRY,
            },
            {
              'Para Birimi': 'USD ($)',
              'Toplam Gelir': incomeStats.totalRevenueUSD,
              'Toplam Gider': expenseStats.totalExpenseUSD,
              'Net Kar/Zarar': incomeStats.totalRevenueUSD - expenseStats.totalExpenseUSD,
            },
            {
              'Para Birimi': 'EUR (€)',
              'Toplam Gelir': incomeStats.totalRevenueEUR,
              'Toplam Gider': expenseStats.totalExpenseEUR,
              'Net Kar/Zarar': incomeStats.totalRevenueEUR - expenseStats.totalExpenseEUR,
            },
          ];

          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, 'Net Kar Zarar');
        }

        // Dosyayı indir
        const fileName = `${reportType === 'income' ? 'Gelir' : reportType === 'expense' ? 'Gider' : 'Net_Kar_Zarar'}_Raporu_${startDate}_${endDate}.xlsx`;
        XLSX.writeFile(wb, fileName);
      });
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Excel dosyası oluşturulurken hata oluştu');
    }
  };

  // PDF export fonksiyonu
  const handleExportToPDF = () => {
    try {
      // Türkçe ve özel karakterleri ASCII'ye çevir
      const toAscii = (text: string) => {
        if (!text) return '';
        return text
          .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
          .replace(/ü/g, 'u').replace(/Ü/g, 'U')
          .replace(/ş/g, 's').replace(/Ş/g, 'S')
          .replace(/ı/g, 'i').replace(/İ/g, 'I')
          .replace(/ö/g, 'o').replace(/Ö/g, 'O')
          .replace(/ç/g, 'c').replace(/Ç/g, 'C')
          .replace(/→/g, '->')
          .replace(/←/g, '<-')
          .replace(/€/g, 'EUR')
          .replace(/₺/g, 'TRY')
          .replace(/\$/g, 'USD')
          .replace(/[^\x00-\x7F]/g, ''); // Diğer tüm ASCII olmayan karakterleri kaldır
      };

      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setLanguage('tr');
      let yPos = 20;

      // Başlık
      doc.setFillColor(141, 110, 99);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');

      const title = reportType === 'income' ? 'GELIR RAPORU' :
        reportType === 'expense' ? 'GIDER RAPORU' :
          'NET KAR/ZARAR RAPORU';
      doc.text(toAscii(title), 105, 15, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 105, 25, { align: 'center' });

      // Tarih aralığı
      yPos = 45;
      doc.setFillColor(255, 245, 240);
      doc.roundedRect(14, yPos - 3, 182, 12, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(141, 110, 99);
      const dateRange = `${new Date(startDate).toLocaleDateString('tr-TR')} - ${new Date(endDate).toLocaleDateString('tr-TR')}`;
      doc.text(toAscii(dateRange), 105, yPos + 4, { align: 'center' });

      yPos += 15;

      if (reportType === 'income' || reportType === 'expense') {
        // Gelir veya Gider detay tablosu
        const data = reportType === 'income' ? cashIncomeData : supplierPaymentsData;
        const tableData = data.map((t: any) => [
          t.created_at ? new Date(t.created_at).toLocaleDateString('tr-TR') : '-',
          toAscii(t.category || '-'),
          toAscii(t.description || '-'),
          t.currency || 'TRY',
          (Number(t.amount) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [[toAscii('Tarih'), toAscii('Kategori'), toAscii('Aciklama'), 'Para Birimi', 'Tutar']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [141, 110, 99], textColor: 255 },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 30 },
            2: { cellWidth: 70 },
            3: { cellWidth: 25 },
            4: { cellWidth: 30, halign: 'right' },
          },
        });

      } else if (reportType === 'net') {
        // Net kar/zarar özet tablosu
        const tableData = [
          ['TRY',
            incomeStats.totalRevenueTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
            expenseStats.totalExpenseTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
            (incomeStats.totalRevenueTRY - expenseStats.totalExpenseTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2 })],
          ['USD',
            incomeStats.totalRevenueUSD.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
            expenseStats.totalExpenseUSD.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
            (incomeStats.totalRevenueUSD - expenseStats.totalExpenseUSD).toLocaleString('tr-TR', { minimumFractionDigits: 2 })],
          ['EUR',
            incomeStats.totalRevenueEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
            expenseStats.totalExpenseEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 }),
            (incomeStats.totalRevenueEUR - expenseStats.totalExpenseEUR).toLocaleString('tr-TR', { minimumFractionDigits: 2 })],
        ];

        autoTable(doc, {
          startY: yPos,
          head: [[toAscii('Para Birimi'), toAscii('Toplam Gelir'), toAscii('Toplam Gider'), toAscii('Net Kar/Zarar')]],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [141, 110, 99], textColor: 255 },
          styles: { fontSize: 11, cellPadding: 5 },
          columnStyles: {
            0: { cellWidth: 40, halign: 'center' },
            1: { cellWidth: 50, halign: 'right' },
            2: { cellWidth: 50, halign: 'right' },
            3: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
          },
        });
      }

      // Dosyayı kaydet
      const fileName = `${reportType === 'income' ? 'Gelir' : reportType === 'expense' ? 'Gider' : 'Net_Kar_Zarar'}_Raporu_${startDate}_${endDate}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDF dosyası oluşturulurken hata oluştu');
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
                  onClick={handleExportToExcel}
                >
                  Excel
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdf />}
                  onClick={handleExportToPDF}
                  color="error"
                >
                  PDF
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