import React, { useState, useEffect, useCallback } from 'react';
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
  Switch,
  FormControlLabel,
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
  Add,
  Clear,
  CheckCircle,
  Undo,
} from '@mui/icons-material';
import TablePagination from '@mui/material/TablePagination';
import { dbAPI } from '../services/api';
import { Customer, Product } from '../../main/database/models';
import { DEFAULT_CURRENCIES } from '../constants/currencies';
import { formatDate, formatDateTime, getNowISO } from '../utils/dateUtils';
import CurrencySelect from './common/CurrencySelect';
import { Autocomplete, Divider, Paper } from '@mui/material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SaleItem {
  productId: number;
  productName: string;
  color: string; // Yeni: Renk bilgisi
  quantityPieces: number;
  quantityDesi: number;
  unitPricePerDesi: number;
  total: number;
  unit: 'desi' | 'ayak';
}

interface CustomerSale {
  id: number;
  date: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    unit?: 'desi' | 'ayak';
  }>;
  totalAmount: number;
  currency?: string;
  status: string;
  notes?: string;
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
  totalSalesTRY: number;
  totalSalesUSD: number;
  totalSalesEUR: number;
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
    totalSalesTRY: 0,
    totalSalesUSD: 0,
    totalSalesEUR: 0,
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
  const [deleteSaleDialogOpen, setDeleteSaleDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<CustomerSale | null>(null);
  
  // Return dialog states
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnSale, setReturnSale] = useState<CustomerSale | null>(null);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnItems, setReturnItems] = useState<Array<{
    productId: number;
    productName: string;
    color: string;
    originalQuantityPieces: number;
    originalQuantityDesi: number;
    originalUnitPrice: number;
    originalUnit: string;
    returnQuantityPieces: number;
    returnQuantityDesi: number;
  }>>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [paymentCurrency, setPaymentCurrency] = useState('TRY');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Çek detay alanları
  const [isCheckOfficial, setIsCheckOfficial] = useState(true);
  const [checkNumber, setCheckNumber] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [receivedFrom, setReceivedFrom] = useState('');
  const [firstEndorser, setFirstEndorser] = useState('');
  const [lastEndorser, setLastEndorser] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  
  // Çek alırken çevirme alanları
  const [convertCheckDialogOpen, setConvertCheckDialogOpen] = useState(false);
  const [receiveConvertedAmount, setReceiveConvertedAmount] = useState('');
  const [receiveConvertedCurrency, setReceiveConvertedCurrency] = useState('USD');

  // Sale dialog states
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [saleColor, setSaleColor] = useState<string>(''); // Yeni: Satış rengi
  const [quantityPieces, setQuantityPieces] = useState<string>('');
  const [quantityDesi, setQuantityDesi] = useState<string>('');
  const [unitPricePerDesi, setUnitPricePerDesi] = useState<string>('');
  const [saleCurrency, setSaleCurrency] = useState(DEFAULT_CURRENCIES.SALES);
  const [saleErrors, setSaleErrors] = useState<string[]>([]);
  const [saleUnit, setSaleUnit] = useState<'desi' | 'ayak'>('desi');

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
  const [allSales, setAllSales] = useState<CustomerSale[]>([]); // Tüm satışlar
  const [allPayments, setAllPayments] = useState<CustomerPayment[]>([]); // Tüm ödemeler
  const [filteredSales, setFilteredSales] = useState<CustomerSale[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<CustomerPayment[]>([]);
  const [previousBalance, setPreviousBalance] = useState({ TRY: 0, USD: 0, EUR: 0 });
  const [salesTotals, setSalesTotals] = useState<Record<string, number>>({});
  const [paymentsTotals, setPaymentsTotals] = useState<Record<string, number>>({});

  // Pagination states
  const [salesPage, setSalesPage] = useState(0);
  const [salesRowsPerPage, setSalesRowsPerPage] = useState(10);
  const [paymentsPage, setPaymentsPage] = useState(0);
  const [paymentsRowsPerPage, setPaymentsRowsPerPage] = useState(10);

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
        // Kimden alındı alanını müşteri ismi ile doldur (sadece boşsa)
        if (!receivedFrom) {
          setReceivedFrom(customerResponse.data.name);
        }
      }

      // Ürünleri yükle (satış için)
      const productsResponse = await dbAPI.getProducts();
      if (productsResponse.success && productsResponse.data) {
        const baseProducts = productsResponse.data;
        const expandedProducts: any[] = [];

        // Keçi alt kategorileri
        const keciSubCategories = ['Keçi-Oğlak', 'Keçi-Palto', 'Çoraplık', 'Baskılık'];

        baseProducts.forEach((product: any) => {
          // Orijinal ürünü ekle
          expandedProducts.push(product);

          // Eğer Keçi ise, alt kategorileri de ekle
          if (product.category === 'Keçi') {
            keciSubCategories.forEach(subCategory => {
              expandedProducts.push({
                ...product,
                id: `${product.id}_${subCategory}`, // Benzersiz ID
                category: subCategory,
                original_id: product.id, // Orijinal Keçi ürün ID'si
                stock_quantity: product.stock_quantity // Aynı stok
              });
            });
          }
        });

        setProducts(expandedProducts);
      }

      // Müşteri ödemelerini yükle - TÜM kayıtları yükle (filtreleme frontend'de yapılacak)
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

        // Tarih filtresi kaldırıldı - tüm kayıtlar yükleniyor
        setPayments(formattedPayments);
      }

      // -------- DEĞİŞİKLİK BAŞLANGICI --------

      // Satış verilerini yükle (TÜMÜ)
      // NOT: dbAPI.getSales fonksiyonunuzu 'startDate' ve 'endDate' alacak şekilde güncelleyin.
      // Örnek: const salesResponse = await dbAPI.getSales(startDate, endDate);
      // Şimdilik, eski haliyle (tüm veriyi çekerek) devam ediyoruz:
      const salesResponse = await dbAPI.getSales();
      let allUniqueSalesForStats: any[] = [];
      let customerSalesForUI: CustomerSale[] = [];

      if (salesResponse.success && salesResponse.data) {
        
        console.log('🔍 Backend\'den gelen ilk 10 satış:', salesResponse.data.slice(0, 10).map((r: any) => ({
          id: r.id,
          sale_date: r.sale_date,
          notes: r.notes,
          customer_id: r.customer_id
        })));

        // Bu iki Map, hem UI hem de istatistik sorununu çözecek
        const salesMap = new Map<number, CustomerSale>(); // UI için (sadece bu müşteri, gruplanmış)
        const allSalesForStatsMap = new Map<number, any>(); // Stats için (tüm müşteriler, tekilleştirilmiş)

        salesResponse.data.forEach((row: any) => {
          if (!row || !row.id) return; // Bozuk veri

          // --- 1. İSTATİSTİK İÇİN TEKİL LİSTE (TÜM MÜŞTERİLER) ---
          // 'allSales' listesini (tüm müşteriler) tekilleştir
          if (!allSalesForStatsMap.has(row.id)) {
            // Sadece ana satış bilgilerini al
            allSalesForStatsMap.set(row.id, {
              id: row.id,
              customer_id: row.customer_id,
              total_amount: row.total_amount,
              currency: row.currency,
              sale_date: row.sale_date,
              payment_status: row.payment_status,
            });
          }

          // --- 2. UI İÇİN GRUPLANMIŞ LİSTE (SADECE BU MÜŞTERİ) ---
          // Sadece mevcut müşterinin satışlarını işle
          if (row.customer_id === customerId) {
            let sale = salesMap.get(row.id);

            // Eğer bu satıştaki ilk ürünse, ana satış objesini oluştur
            if (!sale) {
              sale = {
                id: row.id,
                date: row.sale_date,
                totalAmount: row.total_amount,
                currency: row.currency || 'TRY',
                status: row.payment_status,
                notes: row.notes || '', // Notes alanını ekle
                items: [] // Ürün listesini boş başlat
              };
              salesMap.set(row.id, sale);
            }

            // Bu satırdaki ürün bilgisini 'items' dizisine ekle
            // (LEFT JOIN'den dolayı ürün yoksa product_id null gelebilir)
            if (row.product_id) {
              sale.items.push({
                productName: row.color
                  ? `${row.product_name || row.category || 'Bilinmiyor'} - ${row.color}`
                  : (row.product_name || row.category || 'Bilinmiyor'),
                quantity: row.quantity_desi,
                unitPrice: row.unit_price_per_desi,
                total: row.total_price,
                unit: row.unit || 'desi'
              });
            }
          }
        });

        // Map'leri dizilere çevir
        customerSalesForUI = Array.from(salesMap.values());
        allUniqueSalesForStats = Array.from(allSalesForStatsMap.values());

      }

      console.log('🔍 Map\'ten çıkan satışlar (sıralanmadan önce):', customerSalesForUI.map(s => ({
        id: s.id,
        date: s.date,
        notes: s.notes
      })));
      
      // UI state'ini (setSales) gruplanmış ve doğru veriyle güncelle
      // Tarihe göre sırala (en yeni en üstte) - sale_date kullan
      customerSalesForUI.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        
        console.log('🔄 Karşılaştırma:', {
          a: { id: a.id, date: a.date, timestamp: dateA, notes: a.notes },
          b: { id: b.id, date: b.date, timestamp: dateB, notes: b.notes },
          result: dateB - dateA
        });
        
        // Önce tarihe göre sırala
        if (dateB !== dateA) {
          return dateB - dateA;
        }
        
        // Aynı tarihte ise ID'ye göre sırala (en yeni ID en üstte)
        return (b.id || 0) - (a.id || 0);
      });
      
      console.log('✅ Sıralandıktan sonra:', customerSalesForUI.map(s => ({
        id: s.id,
        date: s.date,
        notes: s.notes
      })));
      
      setSales(customerSalesForUI);

      // İstatistikleri hesapla
      if (customerResponse.data) {
        const formattedPaymentsForStats = paymentsResponse.data || [];
        calculateStats(customerResponse.data, formattedPaymentsForStats, allUniqueSalesForStats);
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
    const totalSalesTRY = customerSales
      .filter((sale: any) => (sale.currency || 'TRY') === 'TRY')
      .reduce((sum: number, sale: any) => sum + parseFloat(sale.total_amount || 0), 0);
    const totalSalesUSD = customerSales
      .filter((sale: any) => (sale.currency || 'TRY') === 'USD')
      .reduce((sum: number, sale: any) => sum + parseFloat(sale.total_amount || 0), 0);
    const totalSalesEUR = customerSales
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

    console.log('💰 Veritabanından Gelen Bakiyeler:', {
      balance: customer.balance,
      balance_usd: (customer as any).balance_usd,
      balance_eur: (customer as any).balance_eur,
      balanceTRY,
      balanceUSD,
      balanceEUR
    });

    const lastSale = customerSales.sort((a: any, b: any) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())[0];
    const lastPayment = payments.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];

    const statsData = {
      totalSales,
      totalSalesTRY,
      totalSalesUSD,
      totalSalesEUR,
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
    const filtered = sales
      .filter(sale => {
        const saleDate = new Date(sale.date);

        if (start && end) {
          return saleDate >= start && saleDate < end;
        } else if (start) {
          return saleDate >= start;
        } else if (end) {
          return saleDate < end;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        
        // Önce tarihe göre sırala
        if (dateB !== dateA) {
          return dateB - dateA;
        }
        
        // Aynı tarihte ise ID'ye göre sırala (en yeni ID en üstte)
        return (b.id || 0) - (a.id || 0);
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
      const prevSalesTRY = previousSales.filter(s => (s.currency || 'TRY') === 'TRY').reduce((sum, s) => sum + Number(s.totalAmount), 0);
      const prevSalesUSD = previousSales.filter(s => (s.currency || 'TRY') === 'USD').reduce((sum, s) => sum + Number(s.totalAmount), 0);
      const prevSalesEUR = previousSales.filter(s => (s.currency || 'TRY') === 'EUR').reduce((sum, s) => sum + Number(s.totalAmount), 0);

      const prevPaymentsTRY = previousPayments.filter(p => (p.currency || 'TRY') === 'TRY').reduce((sum, p) => sum + Number(p.amount), 0);
      const prevPaymentsUSD = previousPayments.filter(p => (p.currency || 'TRY') === 'USD').reduce((sum, p) => sum + Number(p.amount), 0);
      const prevPaymentsEUR = previousPayments.filter(p => (p.currency || 'TRY') === 'EUR').reduce((sum, p) => sum + Number(p.amount), 0);

      const prevBalance = {
        TRY: prevSalesTRY - prevPaymentsTRY,
        USD: prevSalesUSD - prevPaymentsUSD,
        EUR: prevSalesEUR - prevPaymentsEUR
      };

      console.log('📅 Önceki Bakiye Hesaplandı:', {
        startDate,
        startDateObject: start,
        previousSalesCount: previousSales.length,
        previousPaymentsCount: previousPayments.length,
        previousSales: previousSales.map(s => ({ date: s.date, amount: s.totalAmount, currency: s.currency })),
        previousPayments: previousPayments.map(p => ({ date: p.paymentDate, amount: p.amount, currency: p.currency })),
        prevSalesTRY,
        prevSalesUSD,
        prevSalesEUR,
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
    const filteredPaymentsData = payments
      .filter(payment => {
        const paymentDate = new Date(payment.paymentDate);

        if (start && end) {
          return paymentDate >= start && paymentDate < end;
        } else if (start) {
          return paymentDate >= start;
        } else if (end) {
          return paymentDate < end;
        }
        return true;
      })
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()); // En yeni en üstte

    setFilteredSales(filtered);
    setFilteredPayments(filteredPaymentsData);

    // Toplam hesapla (backend'den gelen verilerle)
    const salesTotalsCalc: Record<string, number> = {};
    const processedSales = new Set<number>();

    filtered.forEach(sale => {
      if (!processedSales.has(sale.id)) {
        processedSales.add(sale.id);
        const currency = sale.currency || 'TRY';
        if (!salesTotalsCalc[currency]) {
          salesTotalsCalc[currency] = 0;
        }
        salesTotalsCalc[currency] += Number(sale.totalAmount) || 0;
      }
    });

    const paymentsTotalsCalc: Record<string, number> = {};
    filteredPaymentsData.forEach(payment => {
      const currency = payment.currency || 'TRY';
      if (!paymentsTotalsCalc[currency]) {
        paymentsTotalsCalc[currency] = 0;
      }
      paymentsTotalsCalc[currency] += Number(payment.amount) || 0;
    });

    setSalesTotals(salesTotalsCalc);
    setPaymentsTotals(paymentsTotalsCalc);
  }, [sales, payments, startDate, endDate]);

  // Ödeme ekle
  const handleAddPayment = async () => {
    if (!customer || !paymentAmount || parseFormattedNumber(paymentAmount) <= 0) {
      setSnackbar({ open: true, message: 'Geçerli bir ödeme tutarı girin', severity: 'error' });
      return;
    }

    try {
      const amount = parseFormattedNumber(paymentAmount);
      
      // Çevirme yapıldıysa çevrilen tutarı kullan
      let finalAmount = amount;
      let finalCurrency = paymentCurrency;
      let paymentNotesText = paymentNotes || `Müşteri ödemesi - ${customer.name}`;
      
      if (receiveConvertedAmount && parseFormattedNumber(receiveConvertedAmount) > 0 && (paymentType === 'check' || paymentType === 'promissory_note')) {
        finalAmount = parseFormattedNumber(receiveConvertedAmount);
        finalCurrency = receiveConvertedCurrency;
        paymentNotesText = `${paymentNotesText} (Orijinal: ${paymentCurrency} ${formatNumberWithCommas(amount.toFixed(2))} → Çevrilen: ${receiveConvertedCurrency} ${formatNumberWithCommas(finalAmount.toFixed(2))})`;
      }

      // Ödeme kaydı oluştur - çevrilen tutar ve para birimi ile
      const paymentData = {
        customer_id: customerId,
        amount: finalAmount,
        currency: finalCurrency,
        payment_type: paymentType,
        payment_date: paymentDate, // Kullanıcının seçtiği tarih
        notes: paymentNotesText,
      };

      const paymentResponse = await dbAPI.createPayment(paymentData);
      if (!paymentResponse.success || !paymentResponse.data) {
        throw new Error(paymentResponse.error || 'Ödeme kaydedilemedi');
      }

      // Müşteri bakiyesi artık ödeme kayıtlarından hesaplanıyor, ayrı güncelleme gerekmiyor

      // Ödeme tipine göre kasa veya çek-senet kasasına kaydet
      if (paymentType === 'check' || paymentType === 'promissory_note') {
        // Çek veya Senet - check_transactions tablosuna kaydet
        const checkTransactionData: any = {
          type: 'in' as const,
          amount,
          currency: paymentCurrency,
          check_type: paymentType === 'check' ? 'check' : 'promissory_note',
          is_official: isCheckOfficial,
          check_number: checkNumber || null,
          received_date: receivedDate || null,
          received_from: receivedFrom || customer.name,
          first_endorser: firstEndorser || null,
          last_endorser: lastEndorser || null,
          bank_name: bankName || null,
          branch_name: branchName || null,
          due_date: dueDate || null,
          account_number: accountNumber || null,
          description: paymentNotes || `${customer.name} - ${paymentType === 'check' ? 'Çek' : 'Senet'} Ödemesi`,
          customer_id: customerId,
          customer_name: customer.name,
          payment_id: paymentResponse.data.id, // Ödeme ID'sini ekle
        };

        // Çek alırken çevirme yapıldıysa - sadece bilgi olarak sakla
        if (receiveConvertedAmount && parseFormattedNumber(receiveConvertedAmount) > 0) {
          const convertedAmount = parseFormattedNumber(receiveConvertedAmount);
          
          checkTransactionData.is_converted = true;
          checkTransactionData.received_converted_currency = receiveConvertedCurrency;
          checkTransactionData.received_converted_amount = convertedAmount;
          
          // ÖNEMLİ: Çek kasasına orijinal tutar ve para birimi ile kaydedilir
          // currency ve amount değişmez - elimizdeki çek orijinal haliyle kalır
        }

        console.log('🔵 Çek/Senet işlemi kaydediliyor:', checkTransactionData);
        const checkResponse = await dbAPI.addCheckTransaction(checkTransactionData);
        console.log('🔵 Çek/Senet işlemi yanıtı:', checkResponse);
        
        if (!checkResponse.success) {
          throw new Error(checkResponse.error || 'Çek/Senet işlemi kaydedilemedi');
        }
      } else {
        // Nakit veya Banka Transferi - cash_transactions tablosuna kaydet
        const cashTransactionData = {
          type: 'in' as const,
          amount,
          currency: paymentCurrency,
          category: 'Müşteri Ödemesi',
          description: `${customer.name} - ${paymentType === 'cash' ? 'Nakit' : 'Banka Transferi'} Ödemesi`,
          reference_type: 'payment',
          reference_id: paymentResponse.data.id,
          customer_id: customerId,
          user: 'Kasa Kullanıcısı',
          date: new Date(paymentDate).toISOString(),
        };

        const cashResponse = await dbAPI.createCashTransaction(cashTransactionData);
        if (!cashResponse.success) {
          throw new Error(cashResponse.error || 'Kasa işlemi kaydedilemedi');
        }
      }

      setSnackbar({ open: true, message: 'Ödeme başarıyla kaydedildi', severity: 'success' });

      // Formu temizle ve dialog'u kapat
      setPaymentAmount('');
      setPaymentType('cash');
      setPaymentCurrency('TRY');
      setPaymentNotes('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setIsCheckOfficial(true);
      setCheckNumber('');
      setReceivedDate(new Date().toISOString().split('T')[0]);
      setReceivedFrom('');
      setFirstEndorser('');
      setLastEndorser('');
      setBankName('');
      setBranchName('');
      setDueDate('');
      setAccountNumber('');
      setConvertCheckDialogOpen(false);
      setReceiveConvertedAmount('');
      setReceiveConvertedCurrency('USD');
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

  // PDF İndir - useCallback ile sarmalanmış (previousBalance güncellemelerini yakalamak için)
  const handleDownloadPDF = useCallback(() => {
    if (!customer) return;

    // ✅ DÜZELTME: UI'da zaten hesaplanmış previousBalance state'ini kullan
    // useCallback dependency'leri sayesinde her previousBalance güncellendiğinde bu fonksiyon yeniden oluşturulur
    const pdfPreviousBalance = previousBalance;

    console.log('📄 PDF İndiriliyor - Önceki Bakiye:', {
      previousBalance: pdfPreviousBalance,
      startDate,
      endDate,
      salesCount: sales.length,
      paymentsCount: payments.length,
      filteredSalesCount: filteredSales.length,
      filteredPaymentsCount: filteredPayments.length
    });

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

    // Müşteri ve Tarih Bilgileri (kompakt)
    yPos = 45;
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(14, yPos - 3, 182, 12, 2, 2, 'F');

    // Müşteri adı (sol)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text(toAscii(customer.name), 18, yPos + 4);

    // Tarih aralığı (sağ)
    if (startDate || endDate) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const dateRange = `${startDate ? new Date(startDate).toLocaleDateString('tr-TR') : 'Baslangic'} - ${endDate ? new Date(endDate).toLocaleDateString('tr-TR') : 'Bitis'}`;
      doc.text(dateRange, 192, yPos + 4, { align: 'right' });
    }

    yPos += 12;

    // Bakiye Bilgileri Container (yan yana) - hemen altına
    yPos += 5;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(14, yPos - 3, 182, 14, 2, 2, 'F');

    // Sol taraf: Önceki Bakiye (eğer tarih filtresi varsa)
    if (startDate) {
      // ✅ Ödemeler uygulandıktan sonra kalan bakiyeyi hesapla (UI ile tutarlı)
      let remainingPrevBalanceTRY = pdfPreviousBalance.TRY;
      let remainingPrevBalanceUSD = pdfPreviousBalance.USD;
      let remainingPrevBalanceEUR = pdfPreviousBalance.EUR;

      filteredPayments.forEach(payment => {
        const currency = payment.currency || 'TRY';
        if (currency === 'TRY' && remainingPrevBalanceTRY > 0) {
          const appliedToPrevious = Math.min(payment.amount, remainingPrevBalanceTRY);
          remainingPrevBalanceTRY -= appliedToPrevious;
        } else if (currency === 'USD' && remainingPrevBalanceUSD > 0) {
          const appliedToPrevious = Math.min(payment.amount, remainingPrevBalanceUSD);
          remainingPrevBalanceUSD -= appliedToPrevious;
        } else if (currency === 'EUR' && remainingPrevBalanceEUR > 0) {
          const appliedToPrevious = Math.min(payment.amount, remainingPrevBalanceEUR);
          remainingPrevBalanceEUR -= appliedToPrevious;
        }
      });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(70, 130, 180);
      doc.text('Önceki Dönem Bakiyesi:', 18, yPos + 3);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(7);
      const prevText = `TL ${formatNumber(remainingPrevBalanceTRY)} | USD ${formatNumber(remainingPrevBalanceUSD)} | EUR ${formatNumber(remainingPrevBalanceEUR)}`;
      doc.text(prevText, 18, yPos + 8);

      // Ayırıcı çizgi
      doc.setDrawColor(200, 200, 200);
      doc.line(105, yPos, 105, yPos + 11);
    }

    // Sağ taraf: Güncel Bakiye
    const xStart = startDate ? 110 : 18;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 140, 0);
    doc.text('Güncel Bakiye:', xStart, yPos + 3);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    const balanceText = `TL ${formatNumber(stats.balanceTRY || 0)} | USD ${formatNumber(stats.balanceUSD || 0)} | EUR ${formatNumber(stats.balanceEUR || 0)}`;
    doc.text(balanceText, xStart, yPos + 8);

    yPos += 18;

    // Satış Geçmişi Tablosu
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Satis Gecmisi', 20, yPos);

    const salesTableData = filteredSales.slice(0, 15).map(sale => {
      // Ürünleri alt alta yazdır (virgül yerine satır sonu)
      const itemsText = sale.items.map(item => {
        const currencySymbol = sale.currency === 'TRY' ? 'TL' : sale.currency === 'USD' ? 'USD' : 'EUR';
        const unit = item.unit || 'desi';
        return `${toAscii(item.productName)} (${formatNumber(Math.abs(item.quantity))} ${unit} x ${formatNumber(Math.abs(item.unitPrice))} ${currencySymbol}/${unit})`;
      }).join('\n'); // Virgül yerine satır sonu

      const currencySymbol = sale.currency === 'TRY' ? 'TL' : sale.currency === 'USD' ? 'USD' : 'EUR';
      const isReturn = sale.notes?.includes('İADE') || sale.totalAmount < 0;
      const saleType = isReturn ? 'IADE' : 'SATIS';
      
      return [
        new Date(sale.date).toLocaleDateString('tr-TR'),
        saleType,
        itemsText || 'Detay yok',
        `${isReturn ? '-' : ''}${formatNumber(Math.abs(sale.totalAmount))} ${currencySymbol}`
      ];
    });

    // Toplam satırı ekle
    if (salesTableData.length > 0) {
      const totalText = Object.entries(salesTotals)
        .filter(([_, value]) => value > 0)
        .map(([currency, value]) => {
          const symbol = currency === 'TRY' ? 'TL' : currency;
          return `${symbol} ${formatNumber(value)}`;
        })
        .join(' | ');

      salesTableData.push(['', 'TOPLAM SATIS', totalText]);
    }

    autoTable(doc, {
      startY: yPos + 3,
      head: [['Tarih', 'Tur', 'Urunler', 'Tutar']],
      body: salesTableData.length > 0 ? salesTableData : [['Kayit bulunamadi', '', '', '']],
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
        font: 'helvetica',
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 105 },
        3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      didParseCell: function(data) {
        // Tür kolonu için renk ayarla
        if (data.column.index === 1 && data.cell.raw === 'IADE') {
          data.cell.styles.textColor = [255, 140, 0]; // Turuncu
        } else if (data.column.index === 1 && data.cell.raw === 'SATIS') {
          data.cell.styles.textColor = [39, 174, 96]; // Yeşil
        }
        
        // Tutar kolonu için iade rengini ayarla
        if (data.column.index === 3 && data.cell.raw && typeof data.cell.raw === 'string' && data.cell.raw.startsWith('-')) {
          data.cell.styles.textColor = [231, 76, 60]; // Kırmızı
        }
      }
    });

    // Ödeme Geçmişi Tablosu
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 20;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Odeme Gecmisi', 20, finalY + 10);

    // Filtrelenmiş ödemeleri kullan (tarih filtresine göre) - Tüm ödemeleri al
    const paymentsTableData = filteredPayments.map(payment => {
      const paymentTypeText = payment.paymentType === 'cash' ? 'Nakit' :
        payment.paymentType === 'bank_transfer' ? 'Havale' :
          payment.paymentType === 'check' ? 'Çek' :
            payment.paymentType === 'promissory_note' ? 'Senet' : 'Diğer';
      const currencySymbol = payment.currency === 'TRY' ? 'TL' : payment.currency === 'USD' ? 'USD' : 'EUR';

      return [
        new Date(payment.paymentDate).toLocaleDateString('tr-TR'),
        paymentTypeText,
        `${formatNumber(payment.amount)} ${currencySymbol}`,
        toAscii(payment.notes || '-')
      ];
    });

    // Toplam satırı ekle
    if (paymentsTableData.length > 0) {
      const totalText = Object.entries(paymentsTotals)
        .filter(([_, value]) => value > 0)
        .map(([currency, value]) => {
          const symbol = currency === 'TRY' ? 'TL' : currency;
          return `${symbol} ${formatNumber(value)}`;
        })
        .join(' | ');

      paymentsTableData.push(['', 'TOPLAM ODEME', totalText, '']);
    }

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
  }, [customer, previousBalance, startDate, endDate, sales, payments, filteredSales, filteredPayments, salesTotals, paymentsTotals]); // ✅ Dependency array eklendi

  // Satış fonksiyonları
  const addItemToSale = () => {
    const newErrors: string[] = [];

    if (!selectedProduct) {
      newErrors.push('Lütfen bir ürün seçin');
    }

    if (!saleColor || !saleColor.trim()) {
      newErrors.push('Lütfen renk girin');
    }

    if (!quantityPieces || parseInt(quantityPieces) <= 0) {
      newErrors.push('Geçerli bir adet miktarı girin');
    }

    if (!quantityDesi || parseFormattedNumber(quantityDesi) <= 0) {
      newErrors.push('Geçerli bir desi miktarı girin');
    }

    if (!unitPricePerDesi || parseFormattedNumber(unitPricePerDesi) <= 0) {
      newErrors.push('Geçerli bir desi başına fiyat girin');
    }

    const piecesToSell = parseFormattedNumber(quantityPieces);
    const availableStock = selectedProduct?.stock_quantity || 0;

    if (selectedProduct && quantityPieces && piecesToSell > availableStock) {
      newErrors.push(`Stok yetersiz! Mevcut stok: ${availableStock} adet`);
    }

    if (newErrors.length > 0) {
      setSaleErrors(newErrors);
      return;
    }

    // Keçi alt kategorileri için original_id kullan
    const productId = (selectedProduct as any).original_id || selectedProduct!.id!;

    const item: SaleItem = {
      productId: productId,
      productName: selectedProduct!.category, // Kategori adı (Keçi, Koyun, Keçi-Oğlak, vb.)
      color: saleColor.trim(),
      quantityPieces: piecesToSell,
      quantityDesi: parseFormattedNumber(quantityDesi),
      unitPricePerDesi: parseFormattedNumber(unitPricePerDesi),
      total: parseFormattedNumber(quantityDesi) * parseFormattedNumber(unitPricePerDesi),
      unit: saleUnit,
    };

    console.log('🛒 Satış kalemi eklendi:', item);

    setSaleItems([...saleItems, item]);
    setSelectedProduct(null);
    setSaleColor('');
    setQuantityPieces('');
    setQuantityDesi('');
    setUnitPricePerDesi('');
    setSaleErrors([]);
  };

  const removeItemFromSale = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total, 0);
  };

  const completeSale = async () => {
    if (!customer) {
      setSaleErrors(['Müşteri bilgisi bulunamadı']);
      return;
    }

    if (saleItems.length === 0) {
      setSaleErrors(['Satışa en az bir ürün ekleyin']);
      return;
    }

    setLoading(true);
    try {
      const totalAmount = calculateTotal();

      const saleData = {
        customer_id: customerId,
        total_amount: totalAmount,
        currency: saleCurrency,
        payment_status: 'pending',
        sale_date: saleDate, // Kullanıcının seçtiği tarih
        notes: `Satış - ${saleItems.length} ürün`,
        items: saleItems.map(item => ({
          product_id: item.productId,
          product_name: item.productName,
          color: item.color,
          quantity_pieces: item.quantityPieces,
          quantity_desi: item.quantityDesi,
          unit_price_per_desi: item.unitPricePerDesi,
          total_price: item.total,
          unit: item.unit
        }))
      };

      console.log('📤 Backend\'e gönderilen satış verisi:', JSON.stringify(saleData, null, 2));

      const saleResponse = await dbAPI.createSale(saleData);
      if (!saleResponse.success) {
        throw new Error(saleResponse.error || 'Satış kaydedilemedi');
      }

      setSnackbar({ open: true, message: 'Satış başarıyla tamamlandı', severity: 'success' });

      // Reset form
      setSaleItems([]);
      setSaleCurrency(DEFAULT_CURRENCIES.SALES);
      setSaleDate(new Date().toISOString().split('T')[0]);
      setSaleErrors([]);
      setSaleDialogOpen(false);

      // Verileri yeniden yükle
      await loadCustomerData();

    } catch (error) {
      console.error('Sale completion error:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Satış tamamlanırken hata oluştu',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearSale = () => {
    setSaleItems([]);
    setSelectedProduct(null);
    setQuantityPieces('');
    setQuantityDesi('');
    setUnitPricePerDesi('');
    setSaleErrors([]);
  };

  // Ödeme sil
  const handleDeletePayment = async () => {
    if (!selectedPayment || !customer || !selectedPayment.id) return;

    try {
      // Ödeme tipi çek veya senet mi kontrol et
      if (selectedPayment.paymentType === 'check' || selectedPayment.paymentType === 'promissory_note') {
        // Çek-Senet kasasından ilgili işlemi bul ve sil (payment_id ile)
        try {
          const checkResponse = await dbAPI.getCheckTransactions();
          if (checkResponse.success && checkResponse.data) {
            const relatedCheckTransaction = checkResponse.data.find(
              (t: any) => t.payment_id === selectedPayment.id
            );
            
            if (relatedCheckTransaction && relatedCheckTransaction.id) {
              await dbAPI.deleteCheckTransaction(relatedCheckTransaction.id);
              console.log('İlgili çek/senet işlemi silindi:', relatedCheckTransaction.id);
            }
          }
        } catch (error) {
          console.error('Çek/Senet işlemi silinirken hata:', error);
        }
      } else {
        // Nakit/Banka ödemesi - Kasa işlemini bul ve sil
        try {
          const cashResponse = await dbAPI.getCashTransactions();
          if (cashResponse.success && cashResponse.data) {
            const relatedCashTransaction = cashResponse.data.find(
              (t: any) => t.reference_type === 'payment' && t.reference_id === selectedPayment.id
            );
            if (relatedCashTransaction && relatedCashTransaction.id) {
              await dbAPI.deleteCashTransaction(relatedCashTransaction.id);
            }
          }
        } catch (error) {
          console.error('Kasa işlemi silinirken hata:', error);
        }
      }

      // Ödeme kaydını sil
      const deleteResponse = await dbAPI.deletePayment(selectedPayment.id);
      if (!deleteResponse.success) {
        throw new Error(deleteResponse.error || 'Ödeme silinemedi');
      }

      setSnackbar({ 
        open: true, 
        message: selectedPayment.paymentType === 'check' || selectedPayment.paymentType === 'promissory_note'
          ? 'Ödeme ve ilgili çek/senet işlemi başarıyla silindi'
          : 'Ödeme ve ilgili kasa işlemi başarıyla silindi', 
        severity: 'success' 
      });
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

  // Satış sil
  const handleDeleteSale = async () => {
    if (!selectedSale || !customer || !selectedSale.id) return;

    try {
      setLoading(true);

      // Satışı sil (backend'de bakiye otomatik güncellenir)
      const deleteResponse = await dbAPI.deleteSale(selectedSale.id);
      if (!deleteResponse.success) {
        throw new Error(deleteResponse.error || 'Satış silinemedi');
      }

      setSnackbar({ open: true, message: 'Satış başarıyla silindi ve bakiye güncellendi', severity: 'success' });
      setDeleteSaleDialogOpen(false);
      setSelectedSale(null);

      // Verileri yeniden yükle
      await loadCustomerData();

    } catch (error) {
      console.error('Delete sale error:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Satış silinirken hata oluştu',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // İade işlemini başlat
  const handleOpenReturnDialog = async (sale: CustomerSale) => {
    try {
      setLoading(true);
      
      // Backend'den satış detaylarını çek (product_id bilgisi için)
      const saleDetailResponse = await dbAPI.getSaleById(sale.id);
      
      if (!saleDetailResponse.success || !saleDetailResponse.data) {
        throw new Error('Satış detayları alınamadı');
      }
      
      const saleDetail = saleDetailResponse.data;
      
      setReturnSale(sale);
      
      // Satış kalemlerini iade formu için hazırla
      const items = (saleDetail.items || []).map((item: any) => {
        // Renk bilgisini direkt item'dan al
        const color = item.color || '';
        
        return {
          productId: item.productId,
          productName: item.productName,
          color: color,
          originalQuantityPieces: Math.abs(item.quantityPieces),
          originalQuantityDesi: Math.abs(item.quantityDesi),
          originalUnitPrice: Math.abs(item.unitPricePerDesi),
          originalUnit: item.unit || 'desi',
          returnQuantityPieces: Math.abs(item.quantityPieces), // Default olarak tüm miktar
          returnQuantityDesi: Math.abs(item.quantityDesi),
        };
      });
      
      setReturnItems(items);
      setReturnDate(new Date().toISOString().split('T')[0]); // Reset tarih
      setReturnDialogOpen(true);
    } catch (error) {
      console.error('Return dialog error:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'İade formu açılırken hata oluştu',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // İade miktarını güncelle
  const updateReturnQuantity = (index: number, field: 'pieces' | 'desi', value: string) => {
    const newItems = [...returnItems];
    const numValue = parseFormattedNumber(value);
    
    if (field === 'pieces') {
      newItems[index].returnQuantityPieces = numValue;
    } else {
      newItems[index].returnQuantityDesi = numValue;
    }
    
    setReturnItems(newItems);
  };

  // İade işlemini tamamla
  const handleCompleteReturn = async () => {
    if (!returnSale || !customer) return;

    try {
      setLoading(true);

      // İade edilecek ürünleri filtrele (miktar > 0 olanlar)
      const validReturnItems = returnItems.filter(
        item => item.returnQuantityPieces > 0 && item.returnQuantityDesi > 0
      );

      if (validReturnItems.length === 0) {
        setSnackbar({ open: true, message: 'İade edilecek ürün seçin', severity: 'error' });
        return;
      }

      // Toplam iade tutarını hesapla
      const totalReturnAmount = validReturnItems.reduce(
        (sum, item) => sum + (item.returnQuantityDesi * item.originalUnitPrice),
        0
      );

      // İade için negatif satış oluştur
      const returnSaleData = {
        customer_id: customerId,
        total_amount: -totalReturnAmount, // Negatif değer
        currency: returnSale.currency || 'TRY',
        payment_status: 'pending',
        sale_date: new Date(returnDate).toISOString(), // Kullanıcının seçtiği tarih
        notes: `İADE - Orijinal Satış #${returnSale.id}`,
        items: validReturnItems.map(item => ({
          product_id: item.productId,
          product_name: item.productName,
          color: item.color,
          quantity_pieces: -item.returnQuantityPieces, // Negatif değer
          quantity_desi: item.returnQuantityDesi,
          unit_price_per_desi: item.originalUnitPrice,
          total_price: -(item.returnQuantityDesi * item.originalUnitPrice), // Negatif değer
          unit: (item.originalUnit as 'desi' | 'ayak')
        }))
      };

      const response = await dbAPI.createSale(returnSaleData);
      if (!response.success) {
        throw new Error(response.error || 'İade kaydedilemedi');
      }

      setSnackbar({ open: true, message: 'İade başarıyla tamamlandı', severity: 'success' });
      setReturnDialogOpen(false);
      setReturnSale(null);
      setReturnItems([]);
      setReturnDate(new Date().toISOString().split('T')[0]);

      // Verileri yeniden yükle
      await loadCustomerData();

    } catch (error) {
      console.error('Return error:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'İade işlemi sırasında hata oluştu',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  // Tarih filtresi değiştiğinde verileri yeniden yükle
  useEffect(() => {
    if (customerId) {
      loadCustomerData();
    }
  }, [startDate, endDate]);

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
    <Box sx={{ mt: 2, mr: 2, }}>
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
          startIcon={<ShoppingCart />}
          onClick={() => setSaleDialogOpen(true)}
          size="large"
          color="success"
        >
          Satış Yap
        </Button>
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
      <Box sx={{ mb: 4 }}>
        {/* Customer Info - Horizontal */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5, px: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, mr: 2 }}>
                  <Person sx={{ fontSize: 24 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                    {customer.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Müşteri #{customer.id}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone sx={{ color: 'text.secondary', fontSize: 18 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                    Telefon
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                    {customer.phone || 'Belirtilmemiş'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Business sx={{ color: 'text.secondary', fontSize: 18 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                    Email
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                    {customer.email || 'Belirtilmemiş'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: '200px' }}>
                <LocationOn sx={{ color: 'text.secondary', fontSize: 18 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                    Adres
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                    {customer.address || 'Belirtilmemiş'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1.5 }}>
              <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 0.5, width: 36, height: 36 }}>
                <ShoppingCart sx={{ fontSize: 20 }} />
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.5rem' }}>
                {stats.totalSales}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Toplam Satış
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1.5 }}>
              <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 0.5, width: 36, height: 36 }}>
                <TrendingUp sx={{ fontSize: 20 }} />
              </Avatar>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem' }}>
                Toplam Alışveriş
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                ₺{(stats.totalSalesTRY || 0).toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                ${(stats.totalSalesUSD || 0).toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                €{(stats.totalSalesEUR || 0).toLocaleString('tr-TR')}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1.5 }}>
              <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 0.5, width: 36, height: 36 }}>
                <AttachMoney sx={{ fontSize: 20 }} />
              </Avatar>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem' }}>
                Toplam Ödeme
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                ₺{(stats.totalPaymentsTRY || 0).toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                ${(stats.totalPaymentsUSD || 0).toLocaleString('tr-TR')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                €{(stats.totalPaymentsEUR || 0).toLocaleString('tr-TR')}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1.5 }}>
              <Avatar sx={{
                bgcolor: stats.currentBalance > 0 ? 'error.main' : 'success.main',
                mx: 'auto', mb: 0.5, width: 36, height: 36
              }}>
                <AccountBalance sx={{ fontSize: 20 }} />
              </Avatar>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem' }}>
                Güncel Bakiye
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: (stats.balanceTRY || 0) > 0 ? 'success.main' : 'error.main'
                }}
              >
                {(stats.balanceTRY || 0) > 0 ? '+' : ''}₺{(stats.balanceTRY || 0).toLocaleString('tr-TR')}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: (stats.balanceUSD || 0) > 0 ? 'success.main' : 'error.main'
                }}
              >
                {(stats.balanceUSD || 0) > 0 ? '+' : ''}${(stats.balanceUSD || 0).toLocaleString('tr-TR')}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: (stats.balanceEUR || 0) > 0 ? 'success.main' : 'error.main'
                }}
              >
                {(stats.balanceEUR || 0) > 0 ? '+' : ''}€{(stats.balanceEUR || 0).toLocaleString('tr-TR')}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Tarih Filtreleme - Hem satışlar hem ödemeler için */}
        <Card sx={{ mt: 2 }}>
          <CardContent sx={{ py: 2, px: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Tarih Filtresi (Satışlar ve Ödemeler)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
                startIcon={<Clear />}
              >
                Temizle
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Tables */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Sales History */}
        <Box sx={{ flex: '1 1 450px', minWidth: '450px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Satış Geçmişi ({filteredSales.length} satış)
              </Typography>

              {/* Tarih filtresi yukarıya taşındı */}

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tarih</TableCell>
                      <TableCell>Ürünler</TableCell>
                      <TableCell align="right">Tutar</TableCell>
                      <TableCell align="center">İşlem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSales
                      .slice(salesPage * salesRowsPerPage, salesPage * salesRowsPerPage + salesRowsPerPage)
                      .map((sale, saleIndex) => (
                        <TableRow key={`sale-${sale.id}-${saleIndex}`} hover>
                          <TableCell sx={{ verticalAlign: 'top', minWidth: 100 }}>
                            <Typography variant="body2">
                              {new Date(sale.date).toLocaleDateString('tr-TR')}
                            </Typography>
                            <Chip 
                              label={sale.notes?.includes('İADE') ? 'İADE' : 'SATIŞ'} 
                              size="small" 
                              color={sale.notes?.includes('İADE') ? 'warning' : 'success'}
                              sx={{ mt: 0.5, fontSize: '0.7rem' }}
                            />
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
                                      {Math.abs(item.quantity)} {item.unit || 'desi'} × {sale.currency === 'TRY' ? '₺' : sale.currency === 'EUR' ? '€' : '$'}{Math.abs(item.unitPrice).toLocaleString('tr-TR')}/{item.unit || 'desi'} = {sale.currency === 'TRY' ? '₺' : sale.currency === 'EUR' ? '€' : '$'}{Math.abs(item.total).toLocaleString('tr-TR')}
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
                            {sale.totalAmount < 0 && '-'}
                            {sale.currency === 'TRY' ? '₺' : sale.currency === 'EUR' ? '€' : '$'}{Math.abs(sale.totalAmount || 0).toLocaleString('tr-TR')}
                          </TableCell>
                          <TableCell align="center" sx={{ verticalAlign: 'top' }}>
                            {!sale.notes?.includes('İADE') && (
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => handleOpenReturnDialog(sale)}
                                title="İade Al"
                              >
                                <Undo />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelectedSale(sale);
                                setDeleteSaleDialogOpen(true);
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredSales.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          {startDate || endDate ? 'Bu tarih aralığında satış kaydı bulunmuyor' : 'Henüz satış kaydı bulunmuyor'}
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Toplam Satır */}
                    {filteredSales.length > 0 && (
                      <>
                        <TableRow>
                          <TableCell colSpan={4} sx={{ py: 0.5 }} />
                        </TableRow>
                        <TableRow sx={{ bgcolor: 'primary.light', '& td': { borderTop: '2px solid', borderColor: 'primary.main' } }}>
                          <TableCell colSpan={3} sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            TOPLAM SATIŞ
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            <Box>
                              {salesTotals.TRY > 0 && (
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  ₺{salesTotals.TRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </Typography>
                              )}
                              {salesTotals.USD > 0 && (
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  ${salesTotals.USD.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </Typography>
                              )}
                              {salesTotals.EUR > 0 && (
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  €{salesTotals.EUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      </>
                    )}

                    {/* Geçmiş Aylardan Kalan Bakiye */}
                    {startDate && (() => {
                      console.log('🎨 UI Render - previousBalance:', previousBalance);
                      // Bu dönemdeki ödemelerin önceki bakiyeye uygulanan kısmını hesapla
                      let remainingPrevBalanceTRY = previousBalance.TRY;
                      let remainingPrevBalanceUSD = previousBalance.USD;
                      let remainingPrevBalanceEUR = previousBalance.EUR;

                      filteredPayments.forEach(payment => {
                        const currency = payment.currency || 'TRY';
                        if (currency === 'TRY' && remainingPrevBalanceTRY > 0) {
                          const appliedToPrevious = Math.min(payment.amount, remainingPrevBalanceTRY);
                          remainingPrevBalanceTRY -= appliedToPrevious;
                        } else if (currency === 'USD' && remainingPrevBalanceUSD > 0) {
                          const appliedToPrevious = Math.min(payment.amount, remainingPrevBalanceUSD);
                          remainingPrevBalanceUSD -= appliedToPrevious;
                        } else if (currency === 'EUR' && remainingPrevBalanceEUR > 0) {
                          const appliedToPrevious = Math.min(payment.amount, remainingPrevBalanceEUR);
                          remainingPrevBalanceEUR -= appliedToPrevious;
                        }
                      });

                      return (
                        <>
                          <TableRow>
                            <TableCell colSpan={4} sx={{ py: 1 }} />
                          </TableRow>
                          <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell colSpan={3} sx={{ fontWeight: 600 }}>
                              Önceki Bakiye ({startDate} öncesi)
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: remainingPrevBalanceTRY > 0 ? 'error.main' : remainingPrevBalanceTRY < 0 ? 'success.main' : 'text.secondary',
                                    fontWeight: 600
                                  }}
                                >
                                  {remainingPrevBalanceTRY > 0 ? '+' : ''}₺{remainingPrevBalanceTRY.toLocaleString('tr-TR')}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: remainingPrevBalanceUSD > 0 ? 'error.main' : remainingPrevBalanceUSD < 0 ? 'success.main' : 'text.secondary',
                                    fontWeight: 600
                                  }}
                                >
                                  {remainingPrevBalanceUSD > 0 ? '+' : ''}${remainingPrevBalanceUSD.toLocaleString('tr-TR')}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: remainingPrevBalanceEUR > 0 ? 'error.main' : remainingPrevBalanceEUR < 0 ? 'success.main' : 'text.secondary',
                                    fontWeight: 600
                                  }}
                                >
                                  {remainingPrevBalanceEUR > 0 ? '+' : ''}€{remainingPrevBalanceEUR.toLocaleString('tr-TR')}
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredSales.length}
                page={salesPage}
                onPageChange={(_, newPage) => setSalesPage(newPage)}
                rowsPerPage={salesRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setSalesRowsPerPage(parseInt(e.target.value, 10));
                  setSalesPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Sayfa başına satır:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
              />
            </CardContent>
          </Card>
        </Box>

        {/* Payment History */}
        <Box sx={{ flex: '1 1 400px', minWidth: '450px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Ödeme Geçmişi ({filteredPayments.length} ödeme)
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tarih</TableCell>
                      <TableCell align="right">Tutar</TableCell>
                      <TableCell>Uygulanan</TableCell>
                      <TableCell>Tip</TableCell>
                      <TableCell align="center">İşlem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      // Ödemeleri işlerken önceki bakiyeyi takip et
                      let remainingPrevBalanceTRY = previousBalance.TRY;
                      let remainingPrevBalanceUSD = previousBalance.USD;
                      let remainingPrevBalanceEUR = previousBalance.EUR;

                      return filteredPayments
                        .slice(paymentsPage * paymentsRowsPerPage, paymentsPage * paymentsRowsPerPage + paymentsRowsPerPage)
                        .map((payment) => {
                          const currency = payment.currency || 'TRY';
                          let appliedToPrevious = 0;
                          let appliedToCurrent = 0;

                          // Ödemeyi önce önceki bakiyeye uygula
                          if (currency === 'TRY' && remainingPrevBalanceTRY > 0) {
                            appliedToPrevious = Math.min(payment.amount, remainingPrevBalanceTRY);
                            appliedToCurrent = payment.amount - appliedToPrevious;
                            remainingPrevBalanceTRY -= appliedToPrevious;
                          } else if (currency === 'USD' && remainingPrevBalanceUSD > 0) {
                            appliedToPrevious = Math.min(payment.amount, remainingPrevBalanceUSD);
                            appliedToCurrent = payment.amount - appliedToPrevious;
                            remainingPrevBalanceUSD -= appliedToPrevious;
                          } else if (currency === 'EUR' && remainingPrevBalanceEUR > 0) {
                            appliedToPrevious = Math.min(payment.amount, remainingPrevBalanceEUR);
                            appliedToCurrent = payment.amount - appliedToPrevious;
                            remainingPrevBalanceEUR -= appliedToPrevious;
                          } else {
                            appliedToCurrent = payment.amount;
                          }

                          const currencySymbol = payment.currency === 'TRY' ? '₺' : payment.currency === 'EUR' ? '€' : '$';

                          return (
                            <TableRow key={payment.id}>
                              <TableCell>
                                {new Date(payment.paymentDate).toLocaleDateString('tr-TR')}
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                                  +{currencySymbol}{formatNumberWithCommas(payment.amount.toString())}
                                </Typography>
                                {payment.notes && payment.notes.includes('Orijinal:') && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    {payment.notes.match(/\(([^)]+)\)/)?.[1] || ''}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {appliedToPrevious > 0 && appliedToCurrent > 0 ? (
                                  <Box>
                                    <Chip label={`Önceki: ${currencySymbol}${formatNumberWithCommas(appliedToPrevious.toFixed(2))}`} size="small" color="warning" sx={{ mb: 0.5, display: 'block' }} />
                                    <Chip label={`Bu Dönem: ${currencySymbol}${formatNumberWithCommas(appliedToCurrent.toFixed(2))}`} size="small" color="info" />
                                  </Box>
                                ) : appliedToPrevious > 0 ? (
                                  <Chip label="Önceki Bakiye" size="small" color="warning" />
                                ) : (
                                  <Chip label="Bu Dönem" size="small" color="info" />
                                )}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={
                                    payment.paymentType === 'cash' ? 'Nakit' :
                                    payment.paymentType === 'bank_transfer' ? 'Banka' :
                                    payment.paymentType === 'check' ? 'Çek' :
                                    payment.paymentType === 'promissory_note' ? 'Senet' : 'Diğer'
                                  }
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
                          );
                        });
                    })()}
                    {filteredPayments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          Henüz ödeme kaydı bulunmuyor
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Toplam Satır */}
                    {filteredPayments.length > 0 && (
                      <>
                        <TableRow>
                          <TableCell colSpan={5} sx={{ py: 0.5 }} />
                        </TableRow>
                        <TableRow sx={{ bgcolor: 'success.light', '& td': { borderTop: '2px solid', borderColor: 'success.main' } }}>
                          <TableCell colSpan={2} sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            TOPLAM ÖDEME
                          </TableCell>
                          <TableCell align="right" colSpan={3} sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            <Box>
                              {paymentsTotals.TRY > 0 && (
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark' }}>
                                  ₺{paymentsTotals.TRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </Typography>
                              )}
                              {paymentsTotals.USD > 0 && (
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark' }}>
                                  ${paymentsTotals.USD.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </Typography>
                              )}
                              {paymentsTotals.EUR > 0 && (
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark' }}>
                                  €{paymentsTotals.EUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filteredPayments.length}
                page={paymentsPage}
                onPageChange={(_, newPage) => setPaymentsPage(newPage)}
                rowsPerPage={paymentsRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setPaymentsRowsPerPage(parseInt(e.target.value, 10));
                  setPaymentsPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Sayfa başına satır:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
              />
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
                <MenuItem value="promissory_note">Senet</MenuItem>
              </Select>
            </FormControl>

            {/* Çek/Senet Detay Alanları */}
            {(paymentType === 'check' || paymentType === 'promissory_note') && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {paymentType === 'check' ? 'Çek' : 'Senet'} Detayları
                </Typography>
                
                <FormControl fullWidth>
                  <InputLabel>Tür</InputLabel>
                  <Select
                    value={isCheckOfficial ? 'official' : 'unofficial'}
                    label="Tür"
                    onChange={(e) => setIsCheckOfficial(e.target.value === 'official')}
                  >
                    <MenuItem value="official">Resmi</MenuItem>
                    <MenuItem value="unofficial">Gayrıresmi</MenuItem>
                  </Select>
                </FormControl>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    label={paymentType === 'check' ? 'Çek No' : 'Senet No'}
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

                <Divider sx={{ my: 1 }} />

                {/* Çek Alırken Çevirme Butonu */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => setConvertCheckDialogOpen(true)}
                  >
                    Çevir
                  </Button>
                </Box>
              </Box>
            )}

            <TextField
              fullWidth
              label="Ödeme Tarihi"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true }
              }}
            />
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
                <strong>Tip:</strong> {
                  selectedPayment.paymentType === 'cash' ? 'Nakit' :
                  selectedPayment.paymentType === 'check' ? 'Çek' :
                  selectedPayment.paymentType === 'promissory_note' ? 'Senet' :
                  'Banka Transferi'
                }
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

      {/* Convert Check Dialog */}
      <Dialog open={convertCheckDialogOpen} onClose={() => setConvertCheckDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Çek/Senet Çevirme</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Alert severity="info">
              Müşteriden {paymentCurrency} olarak aldığınız çeki farklı bir para birimine çevirerek kaydedin.
              Çevrilen tutar müşterinin hesabından düşecektir.
            </Alert>
            
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Orijinal Tutar: <strong>{paymentCurrency === 'TRY' ? '₺' : paymentCurrency === 'EUR' ? '€' : '$'}{formatNumberWithCommas(paymentAmount)}</strong>
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <TextField
                fullWidth
                label="Çevrilen Tutar"
                value={receiveConvertedAmount}
                onChange={(e) => {
                  const formatted = formatNumberWithCommas(e.target.value);
                  setReceiveConvertedAmount(formatted);
                }}
                placeholder="Örn: 100.00"
                helperText="Çevrilen tutarı girin"
              />
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Çevrilen Para Birimi</InputLabel>
                <Select
                  value={receiveConvertedCurrency}
                  label="Çevrilen Para Birimi"
                  onChange={(e) => setReceiveConvertedCurrency(e.target.value)}
                >
                  {paymentCurrency !== 'TRY' && <MenuItem value="TRY">₺ TRY</MenuItem>}
                  {paymentCurrency !== 'USD' && <MenuItem value="USD">$ USD</MenuItem>}
                  {paymentCurrency !== 'EUR' && <MenuItem value="EUR">€ EUR</MenuItem>}
                </Select>
              </FormControl>
            </Box>

            {receiveConvertedAmount && (
              <Box sx={{ p: 1.5, bgcolor: 'success.lighter', borderRadius: 1, border: '1px solid', borderColor: 'success.main' }}>
                <Typography variant="body2" color="success.dark" sx={{ fontWeight: 600 }}>
                  Çevrilen Tutar: {receiveConvertedCurrency === 'TRY' ? '₺' : receiveConvertedCurrency === 'EUR' ? '€' : '$'}{formatNumberWithCommas(receiveConvertedAmount)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Bu tutar müşterinin {receiveConvertedCurrency} hesabından düşecektir.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setConvertCheckDialogOpen(false);
            setReceiveConvertedAmount('');
          }}>
            İptal
          </Button>
          <Button 
            onClick={() => setConvertCheckDialogOpen(false)}
            variant="contained"
            disabled={!receiveConvertedAmount || parseFormattedNumber(receiveConvertedAmount) <= 0}
          >
            Uygula
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Sale Dialog */}
      <Dialog open={deleteSaleDialogOpen} onClose={() => setDeleteSaleDialogOpen(false)}>
        <DialogTitle>Satışı Sil</DialogTitle>
        <DialogContent>
          <Typography>
            Bu satışı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve müşteri bakiyesi otomatik olarak güncellenecektir.
          </Typography>
          {selectedSale && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Tarih:</strong> {new Date(selectedSale.date).toLocaleDateString('tr-TR')}
              </Typography>
              <Typography variant="body2">
                <strong>Tutar:</strong> {selectedSale.currency === 'TRY' ? '₺' : selectedSale.currency === 'EUR' ? '€' : '$'}{selectedSale.totalAmount.toLocaleString('tr-TR')}
              </Typography>
              {selectedSale.items && selectedSale.items.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>Ürünler:</strong>
                  </Typography>
                  {selectedSale.items.map((item, idx) => (
                    <Typography key={idx} variant="caption" display="block" sx={{ ml: 2 }}>
                      • {item.productName} ({item.quantity} {item.unit || 'desi'})
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteSaleDialogOpen(false)}>İptal</Button>
          <Button
            onClick={handleDeleteSale}
            color="error"
            variant="contained"
            disabled={loading}
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sale Dialog */}
      <Dialog
        open={saleDialogOpen}
        onClose={() => setSaleDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShoppingCart />
            {customer?.name} - Satış Yap
          </Box>
        </DialogTitle>
        <DialogContent>
          {saleErrors.length > 0 && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {saleErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 200px' }}>
                <TextField
                  fullWidth
                  label="Satış Tarihi"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  size="medium"
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                />
              </Box>

              <Box sx={{ flex: '1 1 200px' }}>
                <CurrencySelect
                  value={saleCurrency}
                  onChange={setSaleCurrency}
                  defaultCurrency={DEFAULT_CURRENCIES.SALES}
                  label="Para Birimi"
                  size="medium"
                />
              </Box>

              <Box sx={{ flex: '2 1 400px' }}>
                <TextField
                  label="Müşteri"
                  value={customer?.name || ''}
                  disabled
                  fullWidth
                  size="medium"
                />
              </Box>
            </Box>

            <Divider />

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 300px' }}>
                <Autocomplete
                  options={products}
                  getOptionLabel={(option) => option.category}
                  value={selectedProduct}
                  onChange={(_, newValue) => setSelectedProduct(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} label="Ürün Seç" size="medium" fullWidth />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box>
                        <Typography variant="body1">
                          {option.category}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Stok: {option.stock_quantity || 0} adet
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Satılacak ürünü seçin
                </Typography>
              </Box>

              <Box sx={{ flex: '1 1 150px' }}>
                <TextField
                  label="Renk"
                  value={saleColor}
                  onChange={(e) => setSaleColor(e.target.value)}
                  fullWidth
                  size="medium"
                  placeholder="Örn: Siyah"
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Deri rengini girin
                </Typography>
              </Box>

              <Box sx={{ flex: '1 1 120px' }}>
                <TextField
                  label="Adet"
                  value={quantityPieces}
                  onChange={(e) => setQuantityPieces(formatNumberWithCommas(e.target.value))}
                  fullWidth
                  size="medium"
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Stoktan düşecek
                </Typography>
              </Box>

              <Box sx={{ flex: '1 1 100px' }}>
                <FormControl fullWidth size="medium">
                  <InputLabel>Birim</InputLabel>
                  <Select
                    value={saleUnit}
                    label="Birim"
                    onChange={(e) => setSaleUnit(e.target.value as 'desi' | 'ayak')}
                  >
                    <MenuItem value="desi">Desi</MenuItem>
                    <MenuItem value="ayak">Ayak</MenuItem>
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Satış birimi
                </Typography>
              </Box>

              <Box sx={{ flex: '1 1 120px' }}>
                <TextField
                  label={saleUnit === 'desi' ? 'Desi' : 'Ayak'}
                  value={quantityDesi}
                  onChange={(e) => setQuantityDesi(formatNumberWithCommas(e.target.value))}
                  fullWidth
                  size="medium"
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Fiyat hesabı için
                </Typography>
              </Box>

              <Box sx={{ flex: '1 1 120px' }}>
                <TextField
                  label={`${saleUnit === 'desi' ? 'Desi' : 'Ayak'} Fiyatı (${saleCurrency === 'USD' ? '$' : saleCurrency === 'TRY' ? '₺' : '€'})`}
                  value={unitPricePerDesi}
                  onChange={(e) => setUnitPricePerDesi(formatNumberWithCommas(e.target.value))}
                  fullWidth
                  size="medium"
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Birim fiyat girin
                </Typography>
              </Box>

              <Box sx={{ flex: '1 1 120px' }}>
                <TextField
                  label="Toplam"
                  value={quantityDesi && unitPricePerDesi ?
                    formatNumberWithCommas((parseFormattedNumber(quantityDesi) * parseFormattedNumber(unitPricePerDesi)).toFixed(2)) : '0'}
                  disabled
                  fullWidth
                  size="medium"
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Otomatik hesaplanan
                </Typography>
              </Box>
            </Box>

            <Button
              variant="contained"
              onClick={addItemToSale}
              startIcon={<Add />}
              fullWidth
              size="large"
            >
              Ürün Ekle
            </Button>

            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Satış Kalemleri ({saleItems.length} ürün)
                  </Typography>
                  {saleItems.length > 0 ? (
                    <>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Ürün</TableCell>
                              <TableCell align="right">Adet</TableCell>
                              <TableCell align="center">Birim</TableCell>
                              <TableCell align="right">Miktar</TableCell>
                              <TableCell align="right">Birim Fiyat</TableCell>
                              <TableCell align="right">Toplam</TableCell>
                              <TableCell align="center">İşlem</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {saleItems.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.productName} - {item.color}</TableCell>
                                <TableCell align="right">{Number(item.quantityPieces).toLocaleString('tr-TR')} adet</TableCell>
                                <TableCell align="center">
                                  <Chip
                                    label={item.unit === 'desi' ? 'Desi' : 'Ayak'}
                                    size="small"
                                    color={item.unit === 'desi' ? 'primary' : 'secondary'}
                                  />
                                </TableCell>
                                <TableCell align="right">{Number(item.quantityDesi).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit}</TableCell>
                                <TableCell align="right">{saleCurrency === 'USD' ? '$' : saleCurrency === 'TRY' ? '₺' : '€'}{Number(item.unitPricePerDesi).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{item.unit}</TableCell>
                                <TableCell align="right">{saleCurrency === 'USD' ? '$' : saleCurrency === 'TRY' ? '₺' : '€'}{Number(item.total).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => removeItemFromSale(index)}
                                  >
                                    <Delete />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">
                          Genel Toplam: {saleCurrency === 'USD' ? '$' : saleCurrency === 'TRY' ? '₺' : '€'}{calculateTotal().toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            startIcon={<Clear />}
                            onClick={clearSale}
                          >
                            Temizle
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<CheckCircle />}
                            onClick={completeSale}
                            disabled={loading}
                          >
                            {loading ? 'Tamamlanıyor...' : 'Satışı Tamamla'}
                          </Button>
                        </Box>
                      </Box>
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        Henüz ürün eklenmedi
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaleDialogOpen(false)}>İptal</Button>
        </DialogActions>
      </Dialog>

      {/* Return Dialog */}
      <Dialog
        open={returnDialogOpen}
        onClose={() => setReturnDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Undo />
            İade İşlemi - Satış #{returnSale?.id}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* İade Tarihi */}
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Undo sx={{ color: 'warning.main', fontSize: 28 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  İade Tarihi
                </Typography>
                <TextField
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  size="small"
                  fullWidth
                  slotProps={{
                    inputLabel: { shrink: true }
                  }}
                />
              </Box>
              <Box sx={{ flex: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Tüm iade kayıtları için geçerli olacak tarihi seçin
                </Typography>
              </Box>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ürün</TableCell>
                    <TableCell align="center">Satış Miktarı</TableCell>
                    <TableCell align="center">İade Adet</TableCell>
                    <TableCell align="center">İade Miktarı</TableCell>
                    <TableCell align="right">Birim Fiyat</TableCell>
                    <TableCell align="right">İade Tutarı</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {returnItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.productName}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary">
                          {item.originalQuantityPieces} adet
                          <br />
                          {item.originalQuantityDesi.toLocaleString('tr-TR')} {item.originalUnit}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          size="small"
                          value={formatNumberWithCommas(item.returnQuantityPieces.toString())}
                          onChange={(e) => updateReturnQuantity(index, 'pieces', e.target.value)}
                          sx={{ width: 100 }}
                          inputProps={{ style: { textAlign: 'center' } }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          size="small"
                          value={formatNumberWithCommas(item.returnQuantityDesi.toString())}
                          onChange={(e) => updateReturnQuantity(index, 'desi', e.target.value)}
                          sx={{ width: 100 }}
                          inputProps={{ style: { textAlign: 'center' } }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {returnSale?.currency === 'TRY' ? '₺' : returnSale?.currency === 'EUR' ? '€' : '$'}
                          {item.originalUnitPrice.toLocaleString('tr-TR')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                          -{returnSale?.currency === 'TRY' ? '₺' : returnSale?.currency === 'EUR' ? '€' : '$'}
                          {(item.returnQuantityDesi * item.originalUnitPrice).toLocaleString('tr-TR')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={5} align="right">
                      <Typography variant="h6">Toplam İade Tutarı:</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" sx={{ color: 'error.main' }}>
                        -{returnSale?.currency === 'TRY' ? '₺' : returnSale?.currency === 'EUR' ? '€' : '$'}
                        {returnItems.reduce((sum, item) => sum + (item.returnQuantityDesi * item.originalUnitPrice), 0).toLocaleString('tr-TR')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Dikkat:</strong> İade işlemi sonrası:
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Ürün stoğu artacaktır</li>
                <li>Müşteri bakiyesi azalacaktır</li>
                <li>İade kaydı satış geçmişinde görünecektir</li>
              </ul>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)}>İptal</Button>
          <Button
            onClick={handleCompleteReturn}
            variant="contained"
            color="warning"
            disabled={loading || returnItems.every(item => item.returnQuantityPieces === 0)}
          >
            {loading ? 'İşleniyor...' : 'İade İşlemini Tamamla'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
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