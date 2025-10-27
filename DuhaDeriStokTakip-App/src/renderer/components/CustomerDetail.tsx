import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  LocationOn,
  Business,
  AccountBalance,
  TrendingUp,
  ShoppingCart,
  AttachMoney,
  Delete,
  PictureAsPdf,
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import { Customer } from '../../main/database/models';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CustomerSale {
  id: number;
  date: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totalAmount: number;
  currency?: string;
  status: string;
}

interface CustomerPayment {
  id: number;
  amount: number;
  paymentType: string;
  paymentDate: string;
  currency?: string;
  notes?: string;
}

interface CustomerStats {
  totalSales: number;
  totalPurchasesTRY: number;
  totalPurchasesUSD: number;
  totalPurchasesEUR: number;
  totalPaymentsTRY: number;
  totalPaymentsUSD: number;
  totalPaymentsEUR: number;
  currentBalance: number;
  balanceTRY?: number;
  balanceUSD?: number;
  balanceEUR?: number;
  lastSaleDate?: string;
  lastPaymentDate?: string;
}

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerId = parseInt(id || '0');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<CustomerSale[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    totalSales: 0,
    totalPurchasesTRY: 0,
    totalPurchasesUSD: 0,
    totalPurchasesEUR: 0,
    totalPaymentsTRY: 0,
    totalPaymentsUSD: 0,
    totalPaymentsEUR: 0,
    currentBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<CustomerPayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [paymentCurrency, setPaymentCurrency] = useState('TRY');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Tarih filtresi state'leri - Default olarak son 1 ay
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  };

  const getDefaultEndDate = () => {
    const date = new Date();
    return date.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [filteredSales, setFilteredSales] = useState<CustomerSale[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<CustomerPayment[]>([]);
  const [previousBalance, setPreviousBalance] = useState({ TRY: 0, USD: 0, EUR: 0 });

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

  // Müşteri verilerini yükle
  const loadCustomerData = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      // Müşteri bilgilerini yükle
      const customerResponse = await dbAPI.getCustomerById(customerId);
      if (customerResponse.success && customerResponse.data) {
        setCustomer(customerResponse.data);
      }

      // Müşteri ödemelerini yükle
      const paymentsResponse = await dbAPI.getCustomerPayments(customerId);
      if (paymentsResponse.success && paymentsResponse.data) {
        const formattedPayments = paymentsResponse.data.map((payment: any) => ({
          id: payment.id,
          amount: payment.amount,
          paymentType: payment.payment_type,
          paymentDate: payment.payment_date,
          currency: payment.currency || 'TRY',
          notes: payment.notes,
        }));
        setPayments(formattedPayments);
      }

      // Satış verilerini yükle (bu müşteriye ait)
      const salesResponse = await dbAPI.getSales();
      if (salesResponse.success && salesResponse.data) {
        // Bu müşteriye ait satışları filtrele ve detaylarını çek
        const customerSalesPromises = salesResponse.data
          .filter((sale: any) => sale.customer_id === customerId)
          .map(async (sale: any) => {
            // Her satış için detayları çek
            const saleDetailResponse = await dbAPI.getSaleById(sale.id);

            let items = [];
            if (saleDetailResponse.success && saleDetailResponse.data) {
              items = (saleDetailResponse.data.items || []).map((item: any) => ({
                productName: item.productName,
                quantity: item.quantityDesi, // Desi olarak göster
                unitPrice: item.unitPricePerDesi,
                total: item.total
              }));
            }

            return {
              id: sale.id,
              date: sale.sale_date,
              totalAmount: sale.total_amount,
              currency: sale.currency || 'TRY',
              status: sale.payment_status,
              items: items
            };
          });

        const customerSales = await Promise.all(customerSalesPromises);
        setSales(customerSales);
      }

      // İstatistikleri hesapla
      if (customerResponse.data && salesResponse.data) {
        const formattedPaymentsForStats = paymentsResponse.data || [];
        const allSalesForStats = salesResponse.data || [];
        calculateStats(customerResponse.data, formattedPaymentsForStats, allSalesForStats);
      }

    } catch (error) {
      console.error('Error loading customer data:', error);
      setSnackbar({ open: true, message: 'Müşteri verileri yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // İstatistikleri hesapla
  const calculateStats = (customer: Customer, payments: any[], allSales: any[]) => {
    console.log('🔍 calculateStats çağrıldı:', {
      customerId,
      customer,
      paymentsCount: payments.length,
      allSalesCount: allSales.length
    });

    const customerSales = allSales.filter((sale: any) => sale.customer_id === customerId);
    console.log('🔍 Müşteriye ait satışlar:', customerSales.length);

    const totalSales = customerSales.length;

    // Para birimi bazında hesaplama - String'leri number'a çevir
    const totalPurchasesTRY = customerSales
      .filter((sale: any) => (sale.currency || 'TRY') === 'TRY')
      .reduce((sum: number, sale: any) => sum + parseFloat(sale.total_amount || 0), 0);
    const totalPurchasesUSD = customerSales
      .filter((sale: any) => (sale.currency || 'TRY') === 'USD')
      .reduce((sum: number, sale: any) => sum + parseFloat(sale.total_amount || 0), 0);
    const totalPurchasesEUR = customerSales
      .filter((sale: any) => (sale.currency || 'TRY') === 'EUR')
      .reduce((sum: number, sale: any) => sum + parseFloat(sale.total_amount || 0), 0);

    const totalPaymentsTRY = payments
      .filter((payment: any) => (payment.currency || 'TRY') === 'TRY')
      .reduce((sum: number, payment: any) => sum + parseFloat(payment.amount || 0), 0);
    const totalPaymentsUSD = payments
      .filter((payment: any) => (payment.currency || 'TRY') === 'USD')
      .reduce((sum: number, payment: any) => sum + parseFloat(payment.amount || 0), 0);
    const totalPaymentsEUR = payments
      .filter((payment: any) => (payment.currency || 'TRY') === 'EUR')
      .reduce((sum: number, payment: any) => sum + parseFloat(payment.amount || 0), 0);

    // Veritabanından gelen bakiyeleri kullan
    const balanceTRY = parseFloat(customer.balance as any) || 0;
    const balanceUSD = parseFloat((customer as any).balance_usd) || 0;
    const balanceEUR = parseFloat((customer as any).balance_eur) || 0;

    const lastSale = customerSales.sort((a: any, b: any) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())[0];
    const lastPayment = payments.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];

    const statsData = {
      totalSales,
      totalPurchasesTRY,
      totalPurchasesUSD,
      totalPurchasesEUR,
      totalPaymentsTRY,
      totalPaymentsUSD,
      totalPaymentsEUR,
      currentBalance: balanceTRY + balanceUSD + balanceEUR,
      balanceTRY,
      balanceUSD,
      balanceEUR,
      lastSaleDate: lastSale?.sale_date,
      lastPaymentDate: lastPayment?.payment_date,
    };

    console.log('📊 Stats Sonuç:', statsData);
    console.log('📊 Stats Tipleri:', {
      balanceTRY: typeof balanceTRY,
      balanceUSD: typeof balanceUSD,
      balanceEUR: typeof balanceEUR,
      totalPaymentsTRY: typeof totalPaymentsTRY,
      totalPaymentsUSD: typeof totalPaymentsUSD,
      totalPaymentsEUR: typeof totalPaymentsEUR
    });

    setStats(statsData);
  };

  // Tarih filtreleme ve geçmiş bakiye hesaplama
  useEffect(() => {
    if (!startDate && !endDate) {
      setFilteredSales(sales);
      setPreviousBalance({ TRY: 0, USD: 0, EUR: 0 });
      return;
    }

    const start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;

    // Bitiş tarihine bir gün ekle (o günü de dahil etmek için)
    if (end) {
      end = new Date(end);
      end.setDate(end.getDate() + 1);
    }

    // Filtrelenmiş satışlar
    const filtered = sales.filter(sale => {
      const saleDate = new Date(sale.date);

      if (start && end) {
        return saleDate >= start && saleDate < end;
      } else if (start) {
        return saleDate >= start;
      } else if (end) {
        return saleDate < end;
      }
      return true;
    });

    // Başlangıç tarihinden önceki satışları hesapla (geçmiş bakiye)
    if (start) {
      const previousSales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate < start;
      });

      const previousPayments = payments.filter(payment => {
        const paymentDate = new Date(payment.paymentDate);
        return paymentDate < start;
      });

      // Geçmiş bakiye hesapla (Satışlar - Ödemeler)
      const prevPurchasesTRY = previousSales.filter(s => (s.currency || 'TRY') === 'TRY').reduce((sum, s) => sum + s.totalAmount, 0);
      const prevPurchasesUSD = previousSales.filter(s => (s.currency || 'TRY') === 'USD').reduce((sum, s) => sum + s.totalAmount, 0);
      const prevPurchasesEUR = previousSales.filter(s => (s.currency || 'TRY') === 'EUR').reduce((sum, s) => sum + s.totalAmount, 0);

      const prevPaymentsTRY = previousPayments.filter(p => (p.currency || 'TRY') === 'TRY').reduce((sum, p) => sum + p.amount, 0);
      const prevPaymentsUSD = previousPayments.filter(p => (p.currency || 'TRY') === 'USD').reduce((sum, p) => sum + p.amount, 0);
      const prevPaymentsEUR = previousPayments.filter(p => (p.currency || 'TRY') === 'EUR').reduce((sum, p) => sum + p.amount, 0);

      const prevBalance = {
        TRY: prevPurchasesTRY - prevPaymentsTRY,
        USD: prevPurchasesUSD - prevPaymentsUSD,
        EUR: prevPurchasesEUR - prevPaymentsEUR
      };
      
      console.log('📅 Önceki Bakiye Hesaplandı:', {
        startDate,
        previousSalesCount: previousSales.length,
        previousPaymentsCount: previousPayments.length,
        prevPurchasesTRY,
        prevPurchasesUSD,
        prevPurchasesEUR,
        prevPaymentsTRY,
        prevPaymentsUSD,
        prevPaymentsEUR,
        prevBalance
      });
      
      setPreviousBalance(prevBalance);
    } else {
      setPreviousBalance({ TRY: 0, USD: 0, EUR: 0 });
    }

    // Filtrelenmiş ödemeler
    const filteredPaymentsData = payments.filter(payment => {
      const paymentDate = new Date(payment.paymentDate);

      if (start && end) {
        return paymentDate >= start && paymentDate < end;
      } else if (start) {
        return paymentDate >= start;
      } else if (end) {
        return paymentDate < end;
      }
      return true;
    });

    setFilteredSales(filtered);
    setFilteredPayments(filteredPaymentsData);
  }, [sales, payments, startDate, endDate]);

  // Ödeme ekle
  const handleAddPayment = async () => {
    if (!customer || !paymentAmount || parseFormattedNumber(paymentAmount) <= 0) {
      setSnackbar({ open: true, message: 'Geçerli bir ödeme tutarı girin', severity: 'error' });
      return;
    }

    try {
      const amount = parseFormattedNumber(paymentAmount);

      // Ödeme kaydı oluştur
      const paymentData = {
        customer_id: customerId,
        amount,
        currency: paymentCurrency,
        payment_type: paymentType,
        payment_date: new Date().toISOString(),
        notes: paymentNotes || `Müşteri ödemesi - ${customer.name}`,
      };

      const paymentResponse = await dbAPI.createPayment(paymentData);
      if (!paymentResponse.success || !paymentResponse.data) {
        throw new Error(paymentResponse.error || 'Ödeme kaydedilemedi');
      }

      // Müşteri bakiyesi artık ödeme kayıtlarından hesaplanıyor, ayrı güncelleme gerekmiyor

      // Kasa işlemi oluştur (gelir)
      const cashTransactionData = {
        type: 'in' as const,
        amount,
        currency: paymentCurrency,
        category: 'Müşteri Ödemesi',
        description: `${customer.name} - Ödeme`,
        reference_type: 'payment',
        reference_id: paymentResponse.data.id,
        customer_id: customerId,
        user: 'Kasa Kullanıcısı',
      };

      await dbAPI.createCashTransaction(cashTransactionData);

      setSnackbar({ open: true, message: 'Ödeme başarıyla kaydedildi', severity: 'success' });

      // Formu temizle ve dialog'u kapat
      setPaymentAmount('');
      setPaymentType('cash');
      setPaymentCurrency('TRY');
      setPaymentNotes('');
      setPaymentDialogOpen(false);

      // Verileri yeniden yükle
      await loadCustomerData();

    } catch (error) {
      console.error('Payment error:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Ödeme kaydedilirken hata oluştu',
        severity: 'error'
      });
    }
  };

  // PDF İndir
  const handleDownloadPDF = () => {
    if (!customer) return;

    // Sayı formatla (NaN kontrolü ile)
    const formatNumber = (num: any) => {
      const n = Number(num);
      return isNaN(n) ? 0 : n.toLocaleString('tr-TR');
    };

    // Türkçe karakterleri ASCII'ye çevir (jsPDF Türkçe desteklemiyor)
    const toAscii = (text: string) => {
      if (!text) return '';
      return text
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u').replace(/Ü/g, 'U')
        .replace(/ş/g, 's').replace(/Ş/g, 'S')
        .replace(/ı/g, 'i').replace(/İ/g, 'I')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/ç/g, 'c').replace(/Ç/g, 'C');
    };

    const doc = new jsPDF('p', 'mm', 'a4');
    let yPos = 20;
    
    // Başlık - Arka plan ile
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MUSTERI HESAP OZETI', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 105, 25, { align: 'center' });
    
    // Müşteri Bilgileri Kutusu
    yPos = 45;
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(14, yPos - 5, 182, 40, 2, 2, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Musteri Bilgileri', 20, yPos);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ad Soyad: ${toAscii(customer.name)}`, 20, yPos + 8);
    doc.text(`Telefon: ${customer.phone || '-'}`, 20, yPos + 15);
    doc.text(`E-posta: ${toAscii(customer.email || '-')}`, 110, yPos + 8);
    doc.text(`Adres: ${toAscii(customer.address || '-')}`, 110, yPos + 15);
    
    // Tarih Aralığı - Müşteri bilgilerinin içinde
    if (startDate || endDate) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Tarih Araligi: ${startDate ? new Date(startDate).toLocaleDateString('tr-TR') : 'Baslangic'} - ${endDate ? new Date(endDate).toLocaleDateString('tr-TR') : 'Bitis'}`, 20, yPos + 25);
    }
    
    // Önceki Dönem Bakiyesi (tarih filtresi varsa göster)
    yPos += 45;
    if (startDate) {
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(230, 240, 255);
      doc.roundedRect(14, yPos - 5, 182, 20, 2, 2, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Onceki Donem Bakiyesi', 20, yPos);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const prevTL = `TL: ${previousBalance.TRY > 0 ? '+' : ''}${formatNumber(previousBalance.TRY)} TL`;
      const prevUSD = `USD: ${previousBalance.USD > 0 ? '+' : ''}${formatNumber(previousBalance.USD)} USD`;
      const prevEUR = `EUR: ${previousBalance.EUR > 0 ? '+' : ''}${formatNumber(previousBalance.EUR)} EUR`;
      doc.text(prevTL, 20, yPos + 10);
      doc.text(prevUSD, 80, yPos + 10);
      doc.text(prevEUR, 140, yPos + 10);
      yPos += 25;
    }
    
    // Bakiye Bilgileri Kutusu
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(255, 248, 220);
    doc.roundedRect(14, yPos - 5, 182, 25, 2, 2, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Guncel Bakiye Durumu', 20, yPos);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const tlBalance = `TL: ${(stats.balanceTRY || 0) > 0 ? '+' : ''}${formatNumber(stats.balanceTRY || 0)} TL`;
    const usdBalance = `USD: ${(stats.balanceUSD || 0) > 0 ? '+' : ''}${formatNumber(stats.balanceUSD || 0)} USD`;
    const eurBalance = `EUR: ${(stats.balanceEUR || 0) > 0 ? '+' : ''}${formatNumber(stats.balanceEUR || 0)} EUR`;
    
    doc.text(tlBalance, 20, yPos + 10);
    doc.text(usdBalance, 80, yPos + 10);
    doc.text(eurBalance, 140, yPos + 10);
    
    yPos += 30;
    
    // Satış Geçmişi Tablosu
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Satis Gecmisi', 20, yPos);
    
    const salesTableData = filteredSales.slice(0, 15).map(sale => {
      const itemsText = sale.items.map(item => {
        const currencySymbol = sale.currency === 'TRY' ? 'TL' : sale.currency === 'USD' ? 'USD' : 'EUR';
        return `${toAscii(item.productName)} (${formatNumber(item.quantity)} desi x ${formatNumber(item.unitPrice)} ${currencySymbol}/desi)`;
      }).join(', ');
      
      const currencySymbol = sale.currency === 'TRY' ? 'TL' : sale.currency === 'USD' ? 'USD' : 'EUR';
      return [
        new Date(sale.date).toLocaleDateString('tr-TR'),
        itemsText || 'Detay yok',
        `${formatNumber(sale.totalAmount)} ${currencySymbol}`
      ];
    });
    
    autoTable(doc, {
      startY: yPos + 3,
      head: [['Tarih', 'Urunler', 'Tutar']],
      body: salesTableData.length > 0 ? salesTableData : [['Kayit bulunamadi', '', '']],
      theme: 'striped',
      headStyles: { 
        fillColor: [52, 73, 94],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
        font: 'helvetica'
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 125 },
        2: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });
    
    // Ödeme Geçmişi Tablosu
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 20;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Odeme Gecmisi', 20, finalY + 10);
    
    const paymentsTableData = filteredPayments.slice(0, 10).map(payment => {
      const paymentTypeText = payment.paymentType === 'cash' ? 'Nakit' : 
                              payment.paymentType === 'bank_transfer' ? 'Havale' : 
                              payment.paymentType === 'check' ? 'Cek' : 'Diger';
      const currencySymbol = payment.currency === 'TRY' ? 'TL' : payment.currency === 'USD' ? 'USD' : 'EUR';
      
      return [
        new Date(payment.paymentDate).toLocaleDateString('tr-TR'),
        paymentTypeText,
        `${formatNumber(payment.amount)} ${currencySymbol}`,
        toAscii(payment.notes || '-')
      ];
    });
    
    autoTable(doc, {
      startY: finalY + 13,
      head: [['Tarih', 'Odeme Tipi', 'Tutar', 'Notlar']],
      body: paymentsTableData.length > 0 ? paymentsTableData : [['Kayit bulunamadi', '', '', '']],
      theme: 'striped',
      headStyles: { 
        fillColor: [39, 174, 96],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        font: 'helvetica'
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        3: { cellWidth: 95 }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });
    
    // Alt bilgi
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Sayfa ${i} / ${pageCount}`, 105, 287, { align: 'center' });
      doc.text(`Olusturulma: ${new Date().toLocaleString('tr-TR')}`, 20, 287);
    }
    
    // PDF'i indir
    const fileName = `${customer.name.replace(/\s+/g, '_')}_Hesap_Ozeti_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.pdf`;
    doc.save(fileName);
    
    setSnackbar({ open: true, message: 'PDF basariyla indirildi', severity: 'success' });
  };

  // Ödeme sil
  const handleDeletePayment = async () => {
    if (!selectedPayment || !customer) return;

    try {
      // Ödeme kaydını sil
      const deleteResponse = await dbAPI.deletePayment(selectedPayment.id);
      if (!deleteResponse.success) {
        throw new Error(deleteResponse.error || 'Ödeme silinemedi');
      }

      // Müşteri bakiyesi artık ödeme kayıtlarından hesaplanıyor, ayrı güncelleme gerekmiyor

      // Kasa işlemini tersine çevir (gider olarak ekle)
      const cashTransactionData = {
        type: 'out' as const,
        amount: selectedPayment.amount,
        currency: selectedPayment.currency || 'TRY',
        category: 'Ödeme İptali',
        description: `${customer.name} - Ödeme iptali`,
        reference_type: 'payment_cancel',
        customer_id: customerId,
        user: 'Kasa Kullanıcısı',
      };

      await dbAPI.createCashTransaction(cashTransactionData);

      setSnackbar({ open: true, message: 'Ödeme başarıyla silindi', severity: 'success' });
      setDeletePaymentDialogOpen(false);
      setSelectedPayment(null);

      // Verileri yeniden yükle
      await loadCustomerData();

    } catch (error) {
      console.error('Delete payment error:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Ödeme silinirken hata oluştu',
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Müşteri bulunamadı
        </Typography>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/customers')} sx={{ mt: 2 }}>
          Müşteri Listesine Dön
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/customers')}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {customer.name}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Müşteri Detay Sayfası
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<PictureAsPdf />}
          onClick={handleDownloadPDF}
          size="large"
          color="error"
        >
          PDF İndir
        </Button>
        <Button
          variant="contained"
          startIcon={<Payment />}
          onClick={() => setPaymentDialogOpen(true)}
          size="large"
        >
          Ödeme Al
        </Button>
      </Box>

      {/* Customer Info & Stats */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        {/* Customer Info */}
        <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60, mr: 2 }}>
                  <Person sx={{ fontSize: 30 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {customer.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Müşteri #{customer.id}
                  </Typography>
                </Box>
              </Box>

              <List dense>
                <ListItem>
                  <Phone sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Telefon"
                    secondary={customer.phone || 'Belirtilmemiş'}
                  />
                </ListItem>
                <ListItem>
                  <Business sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Email"
                    secondary={customer.email || 'Belirtilmemiş'}
                  />
                </ListItem>
                <ListItem>
                  <LocationOn sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Adres"
                    secondary={customer.address || 'Belirtilmemiş'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ flex: '2 1 600px', minWidth: '600px' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}>
                  <ShoppingCart />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {stats.totalSales}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Satış
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}>
                  <TrendingUp />
                </Avatar>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Toplam Alışveriş
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, display: 'block' }}>
                  ₺{(stats.totalPurchasesTRY || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, display: 'block' }}>
                  ${(stats.totalPurchasesUSD || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, display: 'block' }}>
                  €{(stats.totalPurchasesEUR || 0).toLocaleString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 1 }}>
                  <AttachMoney />
                </Avatar>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Toplam Ödeme
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, display: 'block' }}>
                  ₺{(stats.totalPaymentsTRY || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, display: 'block' }}>
                  ${(stats.totalPaymentsUSD || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, display: 'block' }}>
                  €{(stats.totalPaymentsEUR || 0).toLocaleString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Avatar sx={{
                  bgcolor: stats.currentBalance > 0 ? 'error.main' : 'success.main',
                  mx: 'auto', mb: 1
                }}>
                  <AccountBalance />
                </Avatar>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Güncel Bakiye
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 600,
                    display: 'block',
                    color: (stats.balanceTRY || 0) > 0 ? 'error.main' : (stats.balanceTRY || 0) < 0 ? 'success.main' : 'text.primary'
                  }}
                >
                  {(stats.balanceTRY || 0) > 0 ? '+' : ''}₺{(stats.balanceTRY || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 600,
                    display: 'block',
                    color: (stats.balanceUSD || 0) > 0 ? 'error.main' : (stats.balanceUSD || 0) < 0 ? 'success.main' : 'text.primary'
                  }}
                >
                  {(stats.balanceUSD || 0) > 0 ? '+' : ''}${(stats.balanceUSD || 0).toLocaleString('tr-TR')}
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 600,
                    display: 'block',
                    color: (stats.balanceEUR || 0) > 0 ? 'error.main' : (stats.balanceEUR || 0) < 0 ? 'success.main' : 'text.primary'
                  }}
                >
                  {(stats.balanceEUR || 0) > 0 ? '+' : ''}€{(stats.balanceEUR || 0).toLocaleString('tr-TR')}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* Tables */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Sales History */}
        <Box sx={{ flex: '1 1 600px', minWidth: '600px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Satış Geçmişi ({filteredSales.length} satış)
              </Typography>

              {/* Tarih Filtreleme */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                  label="Başlangıç Tarihi"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Bitiş Tarihi"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="outlined"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  size="small"
                >
                  Temizle
                </Button>
              </Box>

              <TableContainer sx={{ maxHeight: 500 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tarih</TableCell>
                      <TableCell>Ürünler</TableCell>
                      <TableCell align="right">Tutar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id} hover>
                        <TableCell sx={{ verticalAlign: 'top', minWidth: 100 }}>
                          {new Date(sale.date).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell sx={{ verticalAlign: 'top' }}>
                          {sale.items && sale.items.length > 0 ? (
                            <Box>
                              {sale.items.map((item, idx) => (
                                <Box key={idx} sx={{ mb: 0.5 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {item.productName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.quantity} desi × {sale.currency === 'TRY' ? '₺' : sale.currency === 'EUR' ? '€' : '$'}{item.unitPrice.toLocaleString('tr-TR')}/desi = {sale.currency === 'TRY' ? '₺' : sale.currency === 'EUR' ? '€' : '$'}{item.total.toLocaleString('tr-TR')}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Detay bilgisi yok
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ verticalAlign: 'top', fontWeight: 600 }}>
                          {sale.currency === 'TRY' ? '₺' : sale.currency === 'EUR' ? '€' : '$'}{(sale.totalAmount || 0).toLocaleString('tr-TR')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredSales.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          {startDate || endDate ? 'Bu tarih aralığında satış kaydı bulunmuyor' : 'Henüz satış kaydı bulunmuyor'}
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Geçmiş Aylardan Kalan Bakiye */}
                    {startDate && (
                      <>
                        <TableRow>
                          <TableCell colSpan={3} sx={{ py: 1 }} />
                        </TableRow>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell colSpan={2} sx={{ fontWeight: 600 }}>
                          Önceki Bakiye
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            <Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: previousBalance.TRY > 0 ? 'error.main' : previousBalance.TRY < 0 ? 'success.main' : 'text.secondary',
                                  fontWeight: 600
                                }}
                              >
                                {previousBalance.TRY > 0 ? '+' : ''}₺{previousBalance.TRY.toLocaleString('tr-TR')}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: previousBalance.USD > 0 ? 'error.main' : previousBalance.USD < 0 ? 'success.main' : 'text.secondary',
                                  fontWeight: 600
                                }}
                              >
                                {previousBalance.USD > 0 ? '+' : ''}${previousBalance.USD.toLocaleString('tr-TR')}
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: previousBalance.EUR > 0 ? 'error.main' : previousBalance.EUR < 0 ? 'success.main' : 'text.secondary',
                                  fontWeight: 600
                                }}
                              >
                                {previousBalance.EUR > 0 ? '+' : ''}€{previousBalance.EUR.toLocaleString('tr-TR')}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>

        {/* Payment History */}
        <Box sx={{ flex: '1 1 400px', minWidth: '400px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Ödeme Geçmişi ({payments.length} ödeme)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tarih</TableCell>
                      <TableCell align="right">Tutar</TableCell>
                      <TableCell>Tip</TableCell>
                      <TableCell align="center">İşlem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.slice(0, 10).map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {new Date(payment.paymentDate).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                            +{payment.currency === 'TRY' ? '₺' : payment.currency === 'EUR' ? '€' : '$'}{payment.amount.toLocaleString('tr-TR')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={payment.paymentType === 'cash' ? 'Nakit' : 'Banka'}
                            variant="outlined"
                            size="small"
                          />
                        </TableCell>
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
                        <TableCell colSpan={4} align="center">
                          Henüz ödeme kaydı bulunmuyor
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ödeme Al - {customer.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <TextField
                  fullWidth
                  label="Ödeme Tutarı"
                  value={paymentAmount}
                  onChange={(e) => {
                    const formatted = formatNumberWithCommas(e.target.value);
                    setPaymentAmount(formatted);
                  }}
                  slotProps={{
                    input: {
                      startAdornment: <Typography sx={{ mr: 1 }}>{paymentCurrency === 'TRY' ? '₺' : paymentCurrency === 'EUR' ? '€' : '$'}</Typography>,
                    }
                  }}
                />
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <FormControl fullWidth>
                  <InputLabel>Para Birimi</InputLabel>
                  <Select
                    value={paymentCurrency}
                    label="Para Birimi"
                    onChange={(e) => setPaymentCurrency(e.target.value)}
                  >
                    <MenuItem value="TRY">₺ Türk Lirası</MenuItem>
                    <MenuItem value="USD">$ Amerikan Doları</MenuItem>
                    <MenuItem value="EUR">€ Euro</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Ödeme Tipi</InputLabel>
              <Select
                value={paymentType}
                label="Ödeme Tipi"
                onChange={(e) => setPaymentType(e.target.value)}
              >
                <MenuItem value="cash">Nakit</MenuItem>
                <MenuItem value="bank_transfer">Banka Transferi</MenuItem>
                <MenuItem value="check">Çek</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Notlar (Opsiyonel)"
              multiline
              rows={3}
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Ödeme ile ilgili notlar..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPaymentAmount('');
            setPaymentType('cash');
            setPaymentCurrency('TRY');
            setPaymentNotes('');
            setPaymentDialogOpen(false);
          }}>İptal</Button>
          <Button
            onClick={handleAddPayment}
            variant="contained"
            disabled={!paymentAmount || parseFormattedNumber(paymentAmount) <= 0}
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
                <strong>Tutar:</strong> {selectedPayment.currency === 'TRY' ? '₺' : selectedPayment.currency === 'EUR' ? '€' : '$'}{selectedPayment.amount.toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2">
                <strong>Tarih:</strong> {new Date(selectedPayment.paymentDate).toLocaleDateString('tr-TR')}
              </Typography>
              <Typography variant="body2">
                <strong>Tip:</strong> {selectedPayment.paymentType === 'cash' ? 'Nakit' : 'Banka'}
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

export default CustomerDetail;