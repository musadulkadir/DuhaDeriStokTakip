import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
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
  Paper,
  TablePagination,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Add,
  Payment,
  ShoppingCart,
  Business,
  Delete,
  PictureAsPdf,
  Phone,
  EmailOutlined,
  LocationOn,
  TrendingUp,
  AccountBalance,
  Person,
  Clear,
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import { Customer, Product } from '../../main/database/models';
import jsPDF from 'jspdf';
import { formatDate, formatDateForInput, getNowISO, getTodayDateString, getCurrentMonthString, dateStringToISO } from '../utils/dateUtils';
import autoTable from 'jspdf-autotable';

// YENİ: Alım detay modalını import et
// (Bu dosyanın 'SaleDetailModal'a benzer şekilde oluşturulması gerekir)
import PurchaseDetailModal from './PurchaseDetailModal';

interface Purchase {
  id: number;
  date?: string;
  purchase_date?: string;
  created_at?: string;
  total_amount: number;
  currency: string;
  description?: string;
  status: string;
  items?: Array<{
    product_id: number;
    material_name?: string;
    quantity: number;
    unit?: string;
    unit_price: number;
    total_price: number;
  }>;
}

interface Payment {
  id: number;
  date?: string;
  payment_date?: string;
  created_at?: string;
  amount: number;
  currency?: string;
  payment_type: string;
  payment_method?: string;
  description?: string;
  notes?: string;
}

interface NewPayment {
  amount: string;
  currency: string;
  payment_method: string;
  description: string;
  payment_date: string;
}

interface PurchaseItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  brand?: string;
}

interface NewPurchase {
  currency: string;
  notes: string;
  items: PurchaseItem[];
  purchase_date: string;
}

// Tutar formatlama fonksiyonu (Türkiye standardı: 1.234,56)
const formatNumberWithCommas = (value: number | string): string => {
  // Önce number'a çevir
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Geçerli bir sayı değilse 0 döndür
  if (isNaN(numValue)) return '0,00';
  
  const fixed = numValue.toFixed(2);
  const parts = fixed.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${integerPart},${parts[1]}`;
};

const SupplierDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<Customer | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // YENİ: Hangi alım detayının gösterileceğini tutan state
  const [viewingPurchaseId, setViewingPurchaseId] = useState<number | null>(null);

  // Malzemeler
  const [materials, setMaterials] = useState<Product[]>([]);

  // Yeni alım
  const [newPurchase, setNewPurchase] = useState<NewPurchase>({
    currency: 'TRY',
    notes: '',
    items: [],
    purchase_date: formatDateForInput(new Date()),
  });

  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    category: '',
    quantity: '',
    unit_price: '',
    color_shade: '',
    brand: '',
    code: '',
  });

  const [newPayment, setNewPayment] = useState<NewPayment>({
    amount: '',
    currency: 'TRY',
    payment_method: 'cash',
    description: '',
    payment_date: formatDateForInput(new Date()),
  });

  // Çek listesi ve seçili çek
  const [availableChecks, setAvailableChecks] = useState<any[]>([]);
  const [selectedCheckId, setSelectedCheckId] = useState<number | null>(null);
  const [convertCheckDialogOpen, setConvertCheckDialogOpen] = useState(false);
  const [convertedCurrency, setConvertedCurrency] = useState('TRY');
  const [convertedAmount, setConvertedAmount] = useState('');

  // Tarih filtresi - Default: Bugünden 1 ay öncesi ile bugün
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDefaultEndDate = () => {
    return getTodayDateString();
  };

  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());

  // Önceki dönem bakiyesi
  const [previousBalance, setPreviousBalance] = useState({ TRY: 0, USD: 0, EUR: 0 });

  // Pagination state'leri
  const [purchasePage, setPurchasePage] = useState(0);
  const [paymentPage, setPaymentPage] = useState(0);
  const rowsPerPage = 10;

  // Pagination handler'ları - useCallback ile optimize edildi
  const handlePurchasePageChange = useCallback((event: unknown, newPage: number) => {
    setPurchasePage(newPage);
  }, []);

  const handlePaymentPageChange = useCallback((event: unknown, newPage: number) => {
    setPaymentPage(newPage);
  }, []);

  // Tedarikçi bakiyesini hesapla
  // Veritabanından gelen bakiyeleri kullan
  const getSupplierBalance = () => {
    if (!supplier) {
      return { balanceTRY: 0, balanceUSD: 0, balanceEUR: 0 };
    }

    const balanceTRY = parseFloat(supplier.balance as any) || 0;
    const balanceUSD = parseFloat(supplier.balance_usd as any) || 0;
    const balanceEUR = parseFloat(supplier.balance_eur as any) || 0;

    console.log('Veritabanından gelen bakiyeler:', {
      supplier: supplier.name,
      balanceTRY,
      balanceUSD,
      balanceEUR,
      rawValues: {
        balance: supplier.balance,
        balance_usd: supplier.balance_usd,
        balance_eur: supplier.balance_eur
      }
    });

    return { balanceTRY, balanceUSD, balanceEUR };
  };

  // Tedarikçi bilgilerini yükle
  const loadSupplier = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await dbAPI.getCustomerById(parseInt(id));
      if (response.success && response.data) {
        setSupplier(response.data);
      } else {
        setSnackbar({ open: true, message: response.error || 'Tedarikçi bulunamadı', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Tedarikçi yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Alım geçmişini yükle
  const loadPurchases = async () => {
    if (!id) return;

    try {
      const response = await dbAPI.getPurchases(); // Bu muhtemelen tüm alımları getiriyor
      if (response.success) {
        // Sadece bu tedarikçiye ait alımları filtrele
        let supplierPurchases = response.data.filter((purchase: any) => purchase.supplier_id === parseInt(id));

        // Tarih filtresini uygula
        if (startDate || endDate) {
          supplierPurchases = supplierPurchases.filter((purchase: any) => {
            const purchaseDate = new Date(purchase.purchase_date || purchase.date || purchase.created_at);
            
            if (startDate && endDate) {
              const start = new Date(startDate);
              start.setHours(0, 0, 0, 0);
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              return purchaseDate >= start && purchaseDate <= end;
            } else if (startDate) {
              const start = new Date(startDate);
              start.setHours(0, 0, 0, 0);
              return purchaseDate >= start;
            } else if (endDate) {
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              return purchaseDate <= end;
            }
            return true;
          });
        }

        // Tarihe göre sırala (en yeni en üstte)
        supplierPurchases.sort((a: any, b: any) => {
          const dateA = new Date(a.purchase_date || a.date || a.created_at).getTime();
          const dateB = new Date(b.purchase_date || b.date || b.created_at).getTime();
          return dateB - dateA;
        });

        console.log('Alım verileri:', supplierPurchases);
        setPurchases(supplierPurchases);
      } else {
        console.error('Alım geçmişi yüklenemedi:', response.error);
        setPurchases([]);
      }
    } catch (error) {
      console.error('Alım geçmişi yüklenirken hata:', error);
      setPurchases([]);
    }
  };

  // Önceki dönem bakiyesini hesapla
  const calculatePreviousBalance = async () => {
    if (!id || !startDate) {
      setPreviousBalance({ TRY: 0, USD: 0, EUR: 0 });
      return;
    }

    try {
      const filterDate = new Date(startDate);
      filterDate.setHours(0, 0, 0, 0);

      // Tüm alımları ve ödemeleri al_
      const purchasesResponse = await dbAPI.getPurchases();
      const paymentsResponse = await dbAPI.getCustomerPayments(parseInt(id)) || undefined;

      let prevBalanceTRY = 0;
      let prevBalanceUSD = 0;
      let prevBalanceEUR = 0;

      if (purchasesResponse.success) {
        const supplierPurchases = purchasesResponse.data.filter((purchase: any) => {
          if (purchase.supplier_id !== parseInt(id)) return false;
          const purchaseDate = new Date(purchase.purchase_date || purchase.date || purchase.created_at);
          return purchaseDate < filterDate;
        });

        supplierPurchases.forEach((purchase: any) => {
          const amount = parseFloat(purchase.total_amount) || 0;
          if (purchase.currency === 'USD') {
            prevBalanceUSD += amount;
          } else if (purchase.currency === 'EUR') {
            prevBalanceEUR += amount;
          } else {
            prevBalanceTRY += amount;
          }
        });
      }

      if (paymentsResponse.success && paymentsResponse.data) {
        const previousPayments = paymentsResponse.data.filter((payment: any) => {
          const paymentDate = new Date(payment.payment_date || payment.date || payment.created_at);
          return paymentDate < filterDate;
        });

        previousPayments.forEach((payment: any) => {
          const amount = parseFloat(payment.amount) || 0;
          if (payment.currency === 'USD') {
            prevBalanceUSD -= amount;
          } else if (payment.currency === 'EUR') {
            prevBalanceEUR -= amount;
          } else {
            prevBalanceTRY -= amount;
          }
        });
      }

      setPreviousBalance({
        TRY: prevBalanceTRY,
        USD: prevBalanceUSD,
        EUR: prevBalanceEUR
      });
    } catch (error) {
      console.error('Önceki bakiye hesaplanırken hata:', error);
      setPreviousBalance({ TRY: 0, USD: 0, EUR: 0 });
    }
  };

  // Ödeme geçmişini yükle
  const loadPayments = async () => {
    if (!id) return;

    try {
      const response = await dbAPI.getCustomerPayments(parseInt(id));
      if (response.success) {
        let allPayments = (response.data || []).map((payment: any) => ({
          ...payment,
          currency: payment.currency || 'TRY',
          notes: payment.notes || payment.description || ''
        }));

        // Tarih filtresini uygula
        if (startDate || endDate) {
          allPayments = allPayments.filter((payment: any) => {
            const paymentDate = new Date(payment.payment_date || payment.date || payment.created_at);
            
            if (startDate && endDate) {
              const start = new Date(startDate);
              start.setHours(0, 0, 0, 0);
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              return paymentDate >= start && paymentDate <= end;
            } else if (startDate) {
              const start = new Date(startDate);
              start.setHours(0, 0, 0, 0);
              return paymentDate >= start;
            } else if (endDate) {
              const end = new Date(endDate);
              end.setHours(23, 59, 59, 999);
              return paymentDate <= end;
            }
            return true;
          });
        }

        // Tarihe göre sırala (en yeni en üstte)
        allPayments.sort((a: any, b: any) => {
          const dateA = new Date(a.payment_date || a.date || a.created_at).getTime();
          const dateB = new Date(b.payment_date || b.date || b.created_at).getTime();
          return dateB - dateA;
        });

        setPayments(allPayments);
      }
    } catch (error) {
      console.error('Ödeme geçmişi yüklenirken hata:', error);
    }
  };

  // Malzemeleri yükle
  const loadMaterials = async () => {
    try {
      const response = await dbAPI.getMaterials();
      if (response.success && response.data) {
        setMaterials(response.data);
      }
    } catch (error) {
      console.error('Malzemeler yüklenirken hata:', error);
    }
  };

  useEffect(() => {
    loadSupplier();
    loadPurchases();
    loadPayments();
    loadMaterials();
    loadAvailableChecks();
  }, [id]);

  const loadAvailableChecks = async () => {
    try {
      const response = await dbAPI.getCheckTransactions();
      if (response.success && response.data) {
        // Sadece gelen ve kullanılmamış çekleri göster (aktif veya protesto)
        const available = response.data.filter((check: any) => 
          check.type === 'in' && (check.status === 'active' || check.status === 'protested')
        );
        setAvailableChecks(available);
      }
    } catch (error) {
      console.error('Çekler yüklenirken hata:', error);
    }
  };

  // Tarih filtresi değiştiğinde alımları ve ödemeleri yeniden yükle
  useEffect(() => {
    if (id) {
      loadPurchases();
      loadPayments();
      calculatePreviousBalance();
      setPurchasePage(0); // Pagination'ı sıfırla
      setPaymentPage(0); // Ödeme pagination'ını da sıfırla
    }
  }, [startDate, endDate]);

  const handleAddPayment = async () => {
    if (!supplier || !newPayment.amount) return;

    // Çek seçiliyse çek seçimi zorunlu
    if (newPayment.payment_method === 'check' && !selectedCheckId) {
      setSnackbar({ open: true, message: 'Lütfen bir çek seçin', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      // Çek seçiliyse, seçilen çekin orijinal tutarını al
      let originalAmount = parseFloat(newPayment.amount.replace(/,/g, ''));
      let originalCurrency = newPayment.currency;
      
      if ((newPayment.payment_method === 'check' || newPayment.payment_method === 'promissory_note') && selectedCheckId) {
        const selectedCheck = availableChecks.find(c => c.id === selectedCheckId);
        if (selectedCheck) {
          originalAmount = selectedCheck.amount;
          originalCurrency = selectedCheck.currency;
        }
      }
      
      // Çevirme yapıldıysa çevrilen tutarı kullan
      let finalAmount = originalAmount;
      let finalCurrency = originalCurrency;
      let paymentNotesText = newPayment.description || `Tedarikci odemesi - ${supplier.name}`;
      
      if (convertedAmount && parseFloat(convertedAmount.replace(/,/g, '')) > 0 && (newPayment.payment_method === 'check' || newPayment.payment_method === 'promissory_note')) {
        finalAmount = parseFloat(convertedAmount.replace(/,/g, ''));
        finalCurrency = convertedCurrency;
        paymentNotesText = `${paymentNotesText} (Orijinal: ${originalCurrency} ${formatNumberWithCommas(originalAmount)} -> Cevrilen: ${convertedCurrency} ${formatNumberWithCommas(finalAmount)})`;
      }
      
      const paymentData = {
        customer_id: supplier.id!,
        amount: finalAmount,
        currency: finalCurrency,
        payment_type: newPayment.payment_method,
        payment_date: newPayment.payment_date,
        notes: paymentNotesText,
      };

      const response = await dbAPI.createPayment(paymentData);
      if (response.success) {
        
        if ((newPayment.payment_method === 'check' || newPayment.payment_method === 'promissory_note') && selectedCheckId) {
          // Çek ile ödeme - Çek-Senet kasasından çıkış
          const selectedCheck = availableChecks.find(c => c.id === selectedCheckId);
          if (selectedCheck) {
            // Çevirme yapıldı mı kontrol et
            const isConverted = convertedAmount && parseFloat(convertedAmount.replace(/,/g, '')) > 0;
            
            // Description oluştur
            let description = `${selectedCheck.description || ''} - Tedarikci Odemesi: ${supplier.name}`;
            if (isConverted) {
              description += ` (Orijinal: ${selectedCheck.currency} ${formatNumberWithCommas(selectedCheck.amount)} -> Cevrilen: ${convertedCurrency} ${formatNumberWithCommas(parseFloat(convertedAmount.replace(/,/g, '')))})`;
            }
            
            await dbAPI.updateCheckTransaction(selectedCheckId, {
              ...selectedCheck,
              status: 'used',
              is_cashed: true,
              cashed_at: new Date().toISOString(),
              description: description.trim(),
              // Verirken çevirme bilgileri
              given_converted_currency: isConverted ? convertedCurrency : null,
              given_converted_amount: isConverted ? parseFloat(convertedAmount.replace(/,/g, '')) : null,
            });
          }
        } else {
          // Nakit/Kart/Transfer - Kasadan ödeme tutarını düş
          const cashTransactionData = {
            type: 'out' as const,
            amount: paymentData.amount,
            currency: paymentData.currency,
            category: 'Tedarikçi Ödemesi',
            description: `${supplier.name} tedarikçisine ödeme - ${paymentData.notes || 'Tedarikçi ödemesi'}`,
            reference_type: 'supplier_payment',
            reference_id: response.data?.id,
            customer_id: supplier.id,
            user: 'Sistem Kullanıcısı',
          };

          try {
            await dbAPI.createCashTransaction(cashTransactionData);
          } catch (error) {
            console.error('Kasa işlemi oluşturulamadı:', error);
          }
        }

        setSnackbar({ 
          open: true, 
          message: (newPayment.payment_method === 'check' || newPayment.payment_method === 'promissory_note')
            ? 'Ödeme başarıyla yapıldı ve çek/senet tedarikçiye verildi' 
            : 'Ödeme başarıyla yapıldı ve kasadan düşürüldü', 
          severity: 'success' 
        });
        setPaymentDialogOpen(false);
        setSelectedCheckId(null);
        setNewPayment({
          amount: '',
          currency: 'TRY',
          payment_method: 'cash',
          description: '',
          payment_date: getTodayDateString(),
        });
        setPaymentPage(0); // Pagination'ı sıfırla
        await loadSupplier(); // Bakiyeyi güncelle
        await loadPayments();
        await calculatePreviousBalance(); // Önceki bakiyeyi güncelle
      } else {
        setSnackbar({ open: true, message: response.error || 'Ödeme kaydedilemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Ödeme kaydedilirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSupplier = async () => {
    if (!supplier) return;

    setLoading(true);
    try {
      const response = await dbAPI.updateCustomer(supplier.id!, supplier);
      if (response.success) {
        setSnackbar({ open: true, message: 'Tedarikçi başarıyla güncellendi', severity: 'success' });
        setEditDialogOpen(false);
      } else {
        setSnackbar({ open: true, message: response.error || 'Tedarikçi güncellenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Tedarikçi güncellenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!window.confirm('Bu ödemeyi silmek istediğinizden emin misiniz?')) return;

    setLoading(true);
    try {
      // Önce ilgili kasa işlemini bul ve sil
      try {
        const cashResponse = await dbAPI.getCashTransactions();
        if (cashResponse.success && cashResponse.data) {
          const relatedCashTransaction = cashResponse.data.find(
            (t: any) => t.reference_type === 'supplier_payment' && t.reference_id === paymentId
          );
          if (relatedCashTransaction && relatedCashTransaction.id) {
            await dbAPI.deleteCashTransaction(relatedCashTransaction.id);
          }
        }
      } catch (error) {
        console.error('Kasa işlemi silinirken hata:', error);
      }

      // Sonra ödemeyi sil
      const response = await dbAPI.deletePayment(paymentId);
      if (response.success) {
        setSnackbar({ open: true, message: 'Ödeme ve ilgili kasa işlemi başarıyla silindi', severity: 'success' });
        setPaymentPage(0); // Pagination'ı sıfırla
        await loadSupplier(); // Bakiyeyi güncelle
        await loadPayments();
        await calculatePreviousBalance(); // Önceki bakiyeyi güncelle
      } else {
        setSnackbar({ open: true, message: response.error || 'Ödeme silinemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Ödeme silinirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePurchase = async (purchaseId: number) => {
    if (!window.confirm('Bu alımı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve stok miktarları güncellenecektir.')) return;

    setLoading(true);
    try {
      const response = await dbAPI.deletePurchase(purchaseId);
      if (response.success) {
        setSnackbar({ open: true, message: 'Alım başarıyla silindi', severity: 'success' });
        setPurchasePage(0); // Pagination'ı sıfırla
        await loadSupplier(); // Bakiyeyi güncelle
        await loadPurchases();
        await calculatePreviousBalance(); // Önceki bakiyeyi güncelle
      } else {
        setSnackbar({ open: true, message: response.error || 'Alım silinemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Alım silinirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Sayı formatlama fonksiyonları (input için)
  const formatInputNumber = (value: string): string => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const parseFormattedNumber = (value: string): number => {
    return parseInt(value.replace(/,/g, '')) || 0;
  };

  const formatDecimalNumber = (value: string): string => {
    const numericValue = value.replace(/[^\d.]/g, '');
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    return numericValue;
  };

  const parseDecimalNumber = (value: string): number => {
    return parseFloat(value.replace(/,/g, '')) || 0;
  };

  // Ondalıklı sayı formatı (input için - üç hane ayıraçlı)
  const formatDecimalInputNumber = (value: string): string => {
    // Sadece rakam ve nokta karakterlerini al
    const numericValue = value.replace(/[^\d.]/g, '');
    if (!numericValue) return '';
    
    // Nokta sayısını kontrol et (sadece bir tane olmalı)
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      // Birden fazla nokta varsa, ilk noktadan sonrasını birleştir
      return formatDecimalInputNumber(parts[0] + '.' + parts.slice(1).join(''));
    }
    
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Tam kısmı üç haneli ayraçlarla formatla (virgül kullan)
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Ondalık kısım varsa nokta ile ekle
    return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  };

  // Ürün ekleme
  const handleAddItem = async () => {
    const quantity = parseFormattedNumber(currentItem.quantity);
    const unitPrice = parseDecimalNumber(currentItem.unit_price);

    if (!currentItem.category || quantity <= 0 || unitPrice <= 0) {
      setSnackbar({ open: true, message: 'Lütfen kategori, miktar ve fiyat alanlarını doldurun', severity: 'error' });
      return;
    }

    // Kategori bazında zorunlu alan kontrolü
    if (currentItem.category === 'Boya' && !currentItem.color_shade) {
      setSnackbar({ open: true, message: 'Boya için renk tonu gerekli', severity: 'error' });
      return;
    }

    if (currentItem.category === 'Binder' && (!currentItem.code)) {
      setSnackbar({ open: true, message: 'Binder için kod gerekli', severity: 'error' });
      return;
    }

    try {
      setLoading(true);

      const materialName = `${currentItem.category}${currentItem.color_shade ? ` - ${currentItem.color_shade}` : ''}${currentItem.code ? ` - ${currentItem.code}` : ''}`;

      // Malzeme kontrolü: Aynı kategori, özellikler VE tedarikçi
      let existingMaterial = materials.find(m => {
        const sameSupplier = (m as any).supplier_id === supplier?.id;

        if (currentItem.category === 'Boya') {
          return m.category === currentItem.category && m.color_shade === currentItem.color_shade && sameSupplier;
        } else if (currentItem.category === 'Cila') {
          return m.category === currentItem.category && sameSupplier;
        } else if (currentItem.category === 'Binder') {
          return m.category === currentItem.category && m.code === currentItem.code && sameSupplier;
        } else if (currentItem.category === 'Kimyasal') {
          return m.category === currentItem.category && m.code === currentItem.code && sameSupplier;
        }
        return false;
      });

      if (existingMaterial) {
        console.log('✅ Mevcut malzeme kullanılıyor:', existingMaterial.id, existingMaterial.name);
      } else {
        console.log('🆕 Yeni malzeme oluşturulacak:', currentItem.category, currentItem.color_shade || currentItem.code);
      }

      let materialId: number;
      let materialBrand: string | undefined;

      if (existingMaterial) {
        materialId = existingMaterial.id!;
        materialBrand = (existingMaterial as any).supplier_name || supplier?.name || undefined;
        setSnackbar({ open: true, message: 'Mevcut malzeme kullanıldı', severity: 'success' });
      } else {
        // Tedarikçi bilgisini kullan (brand yerine)
        const materialData = {
          name: materialName,
          category: currentItem.category,
          color_shade: currentItem.color_shade || undefined,
          brand: undefined, // Brand artık kullanılmıyor
          code: currentItem.code || undefined,
          stock_quantity: 0,
          unit: 'kg',
          description: `${currentItem.category} malzemesi`,
          supplier_id: supplier?.id,
          supplier_name: supplier?.name
        };

        const materialResponse = await dbAPI.createMaterial(materialData);
        if (!materialResponse.success || !materialResponse.data) {
          throw new Error('Malzeme oluşturulamadı');
        }

        materialId = materialResponse.data.id || 0;
        materialBrand = supplier?.name || undefined;
        
        // Yeni malzemeyi materials state'ine ekle (loadMaterials beklemeden)
        if (materialResponse.data) {
          setMaterials(prev => [...prev, materialResponse.data as Product]);
        }
        
        setSnackbar({ open: true, message: 'Yeni malzeme oluşturuldu', severity: 'success' });

        await loadMaterials();
      }

      const newItem: PurchaseItem = {
        product_id: materialId,
        product_name: materialName,
        quantity,
        unit_price: unitPrice,
        total_price: quantity * unitPrice,
        brand: materialBrand,
      };

      setNewPurchase(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));

      setCurrentItem({
        product_id: '',
        category: '',
        quantity: '',
        unit_price: '',
        color_shade: '',
        brand: '',
        code: '',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      setSnackbar({ open: true, message: 'Malzeme eklenirken hata oluştu: ' + errorMessage, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Ürün silme
  const handleRemoveItem = (index: number) => {
    setNewPurchase(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Toplam tutarı hesapla
  const calculateTotal = () => {
    return newPurchase.items.reduce((sum, item) => sum + item.total_price, 0);
  };

  // Alım kaydetme
  const handleSavePurchase = async () => {
    if (!supplier || newPurchase.items.length === 0) {
      setSnackbar({ open: true, message: 'Lütfen en az bir ürün ekleyin', severity: 'error' });
      return;
    }

    if (loading) {
      console.log('⚠️ Zaten bir işlem devam ediyor, tekrar tıklama engellendi');
      return;
    }

    setLoading(true);
    try {
      const totalAmount = calculateTotal();

      const purchaseData = {
        supplier_id: supplier.id!,
        total_amount: totalAmount,
        currency: newPurchase.currency,
        notes: newPurchase.notes,
        items: newPurchase.items,
        purchase_date: dateStringToISO(newPurchase.purchase_date),
      };

      const purchaseResponse = await dbAPI.createPurchase(purchaseData);
      if (!purchaseResponse.success) {
        throw new Error(purchaseResponse.error || 'Alım kaydedilemedi');
      }

      // NOT: Kasadan para çıkışı YAPMA! Sadece tedarikçiye borç oluştur.
      // Kasadan para çıkışı sadece ödeme yapıldığında olacak.

      // Tedarikçi bakiyesini güncelle (borç artır)
      const currency = newPurchase.currency || 'TRY';
      const updateData: any = {};

      const currentBalanceTRY = Number(supplier.balance) || 0;
      const currentBalanceUSD = Number(supplier.balance_usd) || 0;
      const currentBalanceEUR = Number(supplier.balance_eur) || 0;

      if (currency === 'USD') {
        updateData.balance_usd = currentBalanceUSD + totalAmount;
      } else if (currency === 'EUR') {
        updateData.balance_eur = currentBalanceEUR + totalAmount;
      } else {
        updateData.balance = currentBalanceTRY + totalAmount;
      }

      await dbAPI.updateCustomer(supplier.id!, updateData);

      setSnackbar({ open: true, message: 'Alım başarıyla kaydedildi', severity: 'success' });
      setPurchaseDialogOpen(false);
      setNewPurchase({
        currency: 'TRY',
        notes: '',
        items: [],
        purchase_date: getTodayDateString(),
      });

      await loadMaterials();
      await loadSupplier();
      await loadPurchases();
      await calculatePreviousBalance(); // Önceki bakiyeyi güncelle
    } catch (error) {
      setSnackbar({ open: true, message: 'Alım kaydedilirken hata oluştu', severity: 'error' });
      console.error('Alım kaydetme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = useCallback(async () => {
    if (!supplier) return;

    // ✅ DÜZELTME: UI'da zaten hesaplanmış previousBalance state'ini kullan
    // useCallback dependency'leri sayesinde her previousBalance güncellendiğinde bu fonksiyon yeniden oluşturulur
    const pdfPreviousBalance = previousBalance;

    console.log('📄 PDF İndiriliyor - Önceki Bakiye:', {
      previousBalance: pdfPreviousBalance,
      startDate,
      endDate,
      purchasesCount: purchases.length,
      paymentsCount: payments.length
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
    doc.setFillColor(185, 41, 41);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('TEDARIKCI HESAP OZETI', 105, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 105, 25, { align: 'center' });

    // Tedarikçi ve Tarih Bilgileri (kompakt)
    yPos = 45;
    doc.setFillColor(255, 245, 240);
    doc.roundedRect(14, yPos - 3, 182, 12, 2, 2, 'F');

    // Tedarikçi adı (sol)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 41, 41);
    doc.text(toAscii(supplier.name), 18, yPos + 4);

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

      payments.forEach(payment => {
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
      doc.setTextColor(180, 70, 70);
      doc.text('Onceki Donem Bakiyesi:', 18, yPos + 3);

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
    doc.setTextColor(255, 69, 0);
    doc.text('Guncel Bakiye:', xStart, yPos + 3);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(7);
    const balance = getSupplierBalance();
    const balanceText = `TL ${formatNumber(balance.balanceTRY || 0)} | USD ${formatNumber(balance.balanceUSD || 0)} | EUR ${formatNumber(balance.balanceEUR || 0)}`;
    doc.text(balanceText, xStart, yPos + 8);

    yPos += 18;

    // Alım Geçmişi Tablosu
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Alim Gecmisi', 20, yPos);

    // Alım toplamlarını hesapla
    const purchaseTotals = { TRY: 0, USD: 0, EUR: 0 };
    purchases.slice(0, 15).forEach(purchase => {
      const amount = Number(purchase.total_amount) || 0;
      if (purchase.currency === 'USD') {
        purchaseTotals.USD += amount;
      } else if (purchase.currency === 'EUR') {
        purchaseTotals.EUR += amount;
      } else {
        purchaseTotals.TRY += amount;
      }
    });

    const purchasesTableData = await Promise.all(
      purchases.slice(0, 15).map(async (purchase) => {
        const currencySymbol = purchase.currency === 'TRY' ? 'TL' : purchase.currency === 'USD' ? 'USD' : 'EUR';

        // Alım detaylarını çek
        let itemsText = 'Malzeme alimi';
        try {
          const detailResponse = await dbAPI.getPurchaseById(purchase.id);
          if (detailResponse.success && detailResponse.data && detailResponse.data.items) {
            itemsText = detailResponse.data.items.map((item: any) => {
              const brandText = item.brand ? ` - ${toAscii(item.brand)}` : '';
              return `${toAscii(item.productName)}${brandText} (${formatNumber(item.quantity)} kg x ${formatNumber(item.unitPrice)} ${currencySymbol}/kg)`;
            }).join('\n'); // Virgül yerine satır sonu
          }
        } catch (error) {
          console.error('Alım detayı alınamadı:', error);
        }

        return [
          new Date(purchase.purchase_date || purchase.date || purchase.created_at || '').toLocaleDateString('tr-TR'),
          itemsText || 'Malzeme alimi',
          `${formatNumber(purchase.total_amount)} ${currencySymbol}`
        ];
      })
    );

    // Toplam satırını ekle
    if (purchasesTableData.length > 0) {
      const totalText = [
        purchaseTotals.TRY > 0 ? `TL ${formatNumber(purchaseTotals.TRY)}` : '',
        purchaseTotals.USD > 0 ? `USD ${formatNumber(purchaseTotals.USD)}` : '',
        purchaseTotals.EUR > 0 ? `EUR ${formatNumber(purchaseTotals.EUR)}` : ''
      ].filter(t => t).join(' | ');

      purchasesTableData.push(['', 'TOPLAM', totalText]);
    }

    autoTable(doc, {
      startY: yPos + 3,
      head: [['Tarih', 'Aciklama', 'Tutar']],
      body: purchasesTableData.length > 0 ? purchasesTableData : [['Kayit bulunamadi', '', '']],
      theme: 'striped',
      headStyles: {
        fillColor: [94, 52, 52],
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
      },
      didParseCell: (data: any) => {
        // Son satır (TOPLAM) için özel stil
        if (data.row.index === purchasesTableData.length - 1 && purchasesTableData.length > 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 220, 220];
          data.cell.styles.fontSize = 10;
        }
      }
    });

    // Ödeme Geçmişi Tablosu
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 20;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Odeme Gecmisi', 20, finalY + 10);

    // Filtrelenmiş ödemeleri kullan (tarih filtresine göre) - Tüm ödemeleri al
    // Ödeme toplamlarını hesapla
    const paymentTotals = { TRY: 0, USD: 0, EUR: 0 };
    payments.forEach(payment => {
      const amount = Number(payment.amount) || 0;
      if (payment.currency === 'USD') {
        paymentTotals.USD += amount;
      } else if (payment.currency === 'EUR') {
        paymentTotals.EUR += amount;
      } else {
        paymentTotals.TRY += amount;
      }
    });

    const paymentsTableData = payments.map(payment => {
      const paymentTypeText = payment.payment_type === 'cash' ? 'Nakit' :
        payment.payment_type === 'card' ? 'Kart' :
          payment.payment_type === 'transfer' ? 'Havale' :
            payment.payment_type === 'check' ? 'Cek' :
              payment.payment_type === 'promissory_note' ? 'Senet' : 'Diger';
      const currencySymbol = payment.currency === 'TRY' ? 'TL' : payment.currency === 'USD' ? 'USD' : 'EUR';

      return [
        new Date(payment.payment_date || payment.date || payment.created_at || '').toLocaleDateString('tr-TR'),
        paymentTypeText,
        `${formatNumber(payment.amount)} ${currencySymbol}`,
        toAscii(payment.notes || payment.description || '-')
      ];
    });

    // Toplam satırını ekle
    if (paymentsTableData.length > 0) {
      const totalText = Object.entries(paymentTotals)
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
    const fileName = `${supplier.name.replace(/\s+/g, '_')}_Hesap_Ozeti_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.pdf`;
    doc.save(fileName);

    setSnackbar({ open: true, message: 'PDF basariyla indirildi', severity: 'success' });
  }, [supplier, previousBalance, startDate, endDate, purchases, payments, id]); // ✅ Dependency array eklendi

  const formatCurrency = (amount: number, currency?: string) => {
    const curr = currency || 'TRY';
    const symbol = curr === 'USD' ? '$' : curr === 'EUR' ? '€' : '₺';
    const safeAmount = Number(amount) || 0;
    return `${symbol}${safeAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'error'; // Biz tedarikçiye borçluyuz (kırmızı)
    if (balance < 0) return 'success'; // Tedarikçi bize borçlu (yeşil)
    return 'default';
  };

  // YENİ: Alım satırına tıklandığında modalı açan fonksiyon
  const handlePurchaseRowClick = (purchase: Purchase) => {
    console.log('🖱️ Alım satırına tıklandı:', purchase.id);
    setViewingPurchaseId(purchase.id);
  };

  if (!supplier) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Tedarikçi bulunamadı</Typography>
      </Box>
    );
  }

  const balance = getSupplierBalance();

  return (
    <Box sx={{ mt: 2, mr: 2, }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/suppliers')}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {supplier.name}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Tedarikçi Detay Sayfası
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ShoppingCart />}
          onClick={() => setPurchaseDialogOpen(true)}
          size="large"
          color="success"
        >
          Alım Yap
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
          Ödeme Yap
        </Button>
      </Box>

      {/* Supplier Info & Stats */}
      <Box sx={{ mb: 4 }}>
        {/* Supplier Info - Horizontal */}
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5, px: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, mr: 2 }}>
                  <Business sx={{ fontSize: 24 }} />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                    {supplier.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    Tedarikçi #{supplier.id}
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
                    {supplier.phone || 'Belirtilmemiş'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailOutlined sx={{ color: 'text.secondary', fontSize: 18 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                    Email
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                    {supplier.email || 'Belirtilmemiş'}
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
                    {supplier.address || 'Belirtilmemiş'}
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
                {purchases.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Toplam Alım
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1.5 }}>
              <Avatar sx={{ bgcolor: 'error.main', mx: 'auto', mb: 0.5, width: 36, height: 36 }}>
                <TrendingUp sx={{ fontSize: 20 }} />
              </Avatar>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem' }}>
                Toplam Alım Tutarı
              </Typography>
              {(() => {
                const totals = { TRY: 0, USD: 0, EUR: 0 };
                purchases.forEach(purchase => {
                  const amount = Number(purchase.total_amount) || 0;
                  if (purchase.currency === 'USD') totals.USD += amount;
                  else if (purchase.currency === 'EUR') totals.EUR += amount;
                  else totals.TRY += amount;
                });
                return (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      ₺{totals.TRY.toLocaleString('tr-TR')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      ${totals.USD.toLocaleString('tr-TR')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      €{totals.EUR.toLocaleString('tr-TR')}
                    </Typography>
                  </>
                );
              })()}
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1.5 }}>
              <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 0.5, width: 36, height: 36 }}>
                <Payment sx={{ fontSize: 20 }} />
              </Avatar>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.75rem' }}>
                Toplam Ödeme
              </Typography>
              {(() => {
                const totals = { TRY: 0, USD: 0, EUR: 0 };
                payments.forEach(payment => {
                  const amount = Number(payment.amount) || 0;
                  const currency = payment.currency || 'TRY';
                  if (currency === 'USD') totals.USD += amount;
                  else if (currency === 'EUR') totals.EUR += amount;
                  else totals.TRY += amount;
                });
                return (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      ₺{totals.TRY.toLocaleString('tr-TR')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      ${totals.USD.toLocaleString('tr-TR')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                      €{totals.EUR.toLocaleString('tr-TR')}
                    </Typography>
                  </>
                );
              })()}
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 1.5, px: 1.5 }}>
              <Avatar sx={{
                bgcolor: balance.balanceTRY > 0 ? 'error.main' : 'success.main',
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
                  color: balance.balanceTRY > 0 ? 'error.main' : balance.balanceTRY < 0 ? 'success.main' : 'text.secondary'
                }}
              >
                {balance.balanceTRY > 0 ? '+' : ''}₺{balance.balanceTRY.toLocaleString('tr-TR')}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: balance.balanceUSD > 0 ? 'error.main' : balance.balanceUSD < 0 ? 'success.main' : 'text.secondary'
                }}
              >
                {balance.balanceUSD > 0 ? '+' : ''}${balance.balanceUSD.toLocaleString('tr-TR')}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: balance.balanceEUR > 0 ? 'error.main' : balance.balanceEUR < 0 ? 'success.main' : 'text.secondary'
                }}
              >
                {balance.balanceEUR > 0 ? '+' : ''}€{balance.balanceEUR.toLocaleString('tr-TR')}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Tarih Filtreleme - Hem alımlar hem ödemeler için */}
      <Card sx={{ mt: 2 }}>
        <CardContent sx={{ py: 2, px: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Tarih Filtresi (Alımlar ve Ödemeler)
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
                setStartDate(getDefaultStartDate());
                setEndDate(getDefaultEndDate());
              }}
              size="small"
              startIcon={<Clear />}
            >
              Temizle
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Tables */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 2 }}>
        {/* Purchase History */}
        <Box sx={{ flex: '1 1 450px', minWidth: '450px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Alım Geçmişi ({purchases.length} alım)
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tarih</TableCell>
                      <TableCell>Malzemeler</TableCell>
                      <TableCell align="right">Tutar</TableCell>
                      <TableCell align="center">İşlem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          {startDate || endDate ? 'Bu tarih aralığında alım kaydı bulunmuyor' : 'Henüz alım kaydı bulunmuyor'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {purchases
                          .slice(purchasePage * rowsPerPage, purchasePage * rowsPerPage + rowsPerPage)
                          .map((purchase) => (
                            <TableRow key={purchase.id} hover sx={{ cursor: 'pointer' }} onClick={() => handlePurchaseRowClick(purchase)}>
                              <TableCell sx={{ verticalAlign: 'top', minWidth: 100 }}>
                                <Typography variant="body2">
                                  {(() => {
                                    const dateValue = purchase.purchase_date || purchase.date || purchase.created_at;
                                    if (!dateValue) return 'Tarih Belirtilmemiş';
                                    return new Date(dateValue).toLocaleDateString('tr-TR');
                                  })()}
                                </Typography>
                                <Chip 
                                  label="ALIM" 
                                  size="small" 
                                  color="error"
                                  sx={{ mt: 0.5, fontSize: '0.7rem' }}
                                />
                              </TableCell>
                              <TableCell sx={{ verticalAlign: 'top' }}>
                                {purchase.items && purchase.items.length > 0 ? (
                                  <Box>
                                    {purchase.items.map((item: any, idx: number) => (
                                      <Typography key={idx} variant="body2" color="text.secondary">
                                        {item.material_name || 'Malzeme'} - {item.quantity} {item.unit || 'kg'}
                                      </Typography>
                                    ))}
                                  </Box>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    Malzeme alımı
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ verticalAlign: 'top', fontWeight: 600 }}>
                                {purchase.currency === 'TRY' ? '₺' : purchase.currency === 'EUR' ? '€' : '$'}{Math.abs(purchase.total_amount || 0).toLocaleString('tr-TR')}
                              </TableCell>
                              <TableCell align="center" sx={{ verticalAlign: 'top' }}>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePurchase(purchase.id);
                                  }}
                                >
                                  <Delete />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        {/* Toplam Satırı */}
                        <TableRow sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>TOPLAM</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            {(() => {
                              const totals = { TRY: 0, USD: 0, EUR: 0 };
                              purchases.forEach(purchase => {
                                const amount = Number(purchase.total_amount) || 0;
                                if (purchase.currency === 'USD') {
                                  totals.USD += amount;
                                } else if (purchase.currency === 'EUR') {
                                  totals.EUR += amount;
                                } else {
                                  totals.TRY += amount;
                                }
                              });
                              const parts = [];
                              if (totals.TRY > 0) parts.push(`₺${totals.TRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
                              if (totals.USD > 0) parts.push(`$${totals.USD.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
                              if (totals.EUR > 0) parts.push(`€${totals.EUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
                              return parts.join(' | ');
                            })()}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>

                        {/* Önceki Bakiye Satırı - Ödemeler uygulandıktan sonra kalan */}
                        {startDate && (() => {
                          // Ödemelerin önceki bakiyeye uygulanmasını hesapla
                          let remainingPrevBalanceTRY = previousBalance.TRY;
                          let remainingPrevBalanceUSD = previousBalance.USD;
                          let remainingPrevBalanceEUR = previousBalance.EUR;

                          payments.forEach(payment => {
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
                                      {remainingPrevBalanceTRY > 0 ? '+' : ''}₺{remainingPrevBalanceTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: remainingPrevBalanceUSD > 0 ? 'error.main' : remainingPrevBalanceUSD < 0 ? 'success.main' : 'text.secondary',
                                        fontWeight: 600
                                      }}
                                    >
                                      {remainingPrevBalanceUSD > 0 ? '+' : ''}${remainingPrevBalanceUSD.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: remainingPrevBalanceEUR > 0 ? 'error.main' : remainingPrevBalanceEUR < 0 ? 'success.main' : 'text.secondary',
                                        fontWeight: 600
                                      }}
                                    >
                                      {remainingPrevBalanceEUR > 0 ? '+' : ''}€{remainingPrevBalanceEUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </Typography>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            </>
                          );
                        })()}
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {purchases.length > 0 && (
                <TablePagination
                  component="div"
                  count={purchases.length}
                  page={purchasePage}
                  onPageChange={handlePurchasePageChange}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={[rowsPerPage]}
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                  labelRowsPerPage="Sayfa başına:"
                />
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Payment History */}
        <Box sx={{ flex: '1 1 450px', minWidth: '450px' }}>
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
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          Henüz ödeme kaydı bulunmuyor
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {payments
                          .slice(paymentPage * rowsPerPage, paymentPage * rowsPerPage + rowsPerPage)
                          .map((payment) => {
                            const currencySymbol = payment.currency === 'TRY' ? '₺' : payment.currency === 'EUR' ? '€' : '$';

                            return (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  {(() => {
                                    const dateValue = payment.payment_date || payment.date || payment.created_at;
                                    if (!dateValue) return 'Tarih Belirtilmemiş';
                                    return new Date(dateValue).toLocaleDateString('tr-TR');
                                  })()}
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                                    -{currencySymbol}{formatNumberWithCommas(payment.amount.toString())}
                                  </Typography>
                                  {payment.notes && payment.notes.includes('Orijinal:') && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                      {payment.notes.match(/\(([^)]+)\)/)?.[1] || ''}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={
                                      payment.payment_type === 'cash' ? 'Nakit' :
                                      payment.payment_type === 'transfer' ? 'Banka' :
                                      payment.payment_type === 'check' ? 'Çek' :
                                      payment.payment_type === 'promissory_note' ? 'Senet' : 'Diğer'
                                    }
                                    variant="outlined"
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeletePayment(payment.id)}
                                  >
                                    <Delete />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        {/* Toplam Satırı */}
                        <TableRow sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>TOPLAM</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>
                            {(() => {
                              const totals = { TRY: 0, USD: 0, EUR: 0 };
                              payments.forEach(payment => {
                                const amount = Number(payment.amount) || 0;
                                const currency = payment.currency || 'TRY';
                                if (currency === 'USD') {
                                  totals.USD += amount;
                                } else if (currency === 'EUR') {
                                  totals.EUR += amount;
                                } else {
                                  totals.TRY += amount;
                                }
                              });
                              const parts = [];
                              if (totals.TRY > 0) parts.push(`₺${totals.TRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
                              if (totals.USD > 0) parts.push(`$${totals.USD.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
                              if (totals.EUR > 0) parts.push(`€${totals.EUR.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
                              return parts.join(' | ');
                            })()}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {payments.length > 0 && (
                <TablePagination
                  component="div"
                  count={payments.length}
                  page={paymentPage}
                  onPageChange={handlePaymentPageChange}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={[rowsPerPage]}
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                  labelRowsPerPage="Sayfa başına:"
                />
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Add Payment Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>Tedarikçiye Ödeme Yap</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6, }}>
              <TextField
                fullWidth
                label="Tutar"
                value={newPayment.amount}
                onChange={(e) => {
                  const formatted = formatDecimalInputNumber(e.target.value);
                  setNewPayment({ ...newPayment, amount: formatted });
                }}
                helperText="Ödenen tutarı giriniz"
                placeholder="Örn: 10,000.50"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Para Birimi</InputLabel>
                <Select
                  value={newPayment.currency}
                  label="Para Birimi"
                  onChange={(e) => setNewPayment({ ...newPayment, currency: e.target.value })}
                >
                  <MenuItem value="TRY">TRY (₺)</MenuItem>
                  <MenuItem value="USD">USD ($)</MenuItem>
                  <MenuItem value="EUR">EUR (€)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Ödeme Yöntemi</InputLabel>
                <Select
                  value={newPayment.payment_method}
                  label="Ödeme Yöntemi"
                  onChange={(e) => {
                    setNewPayment({ ...newPayment, payment_method: e.target.value });
                    setSelectedCheckId(null);
                  }}
                >
                  <MenuItem value="cash">Nakit</MenuItem>
                  <MenuItem value="card">Kart</MenuItem>
                  <MenuItem value="transfer">Banka Transferi</MenuItem>
                  <MenuItem value="check">Çek</MenuItem>
                  <MenuItem value="promissory_note">Senet</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Çek/Senet Seçimi */}
            {(newPayment.payment_method === 'check' || newPayment.payment_method === 'promissory_note') && (
              <>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth>
                    <InputLabel>Çek Seç</InputLabel>
                    <Select
                      value={selectedCheckId || ''}
                      label="Çek Seç"
                      onChange={(e) => {
                        const checkId = e.target.value as number;
                        setSelectedCheckId(checkId);
                        const selectedCheck = availableChecks.find(c => c.id === checkId);
                        if (selectedCheck) {
                          setNewPayment({
                            ...newPayment,
                            amount: selectedCheck.amount.toString(),
                            currency: selectedCheck.currency,
                          });
                          setConvertedCurrency(selectedCheck.currency);
                          setConvertedAmount(selectedCheck.amount.toString());
                        }
                      }}
                    >
                      {availableChecks.length === 0 ? (
                        <MenuItem value="" disabled>Kullanılabilir çek yok</MenuItem>
                      ) : (
                        availableChecks.map((check) => (
                          <MenuItem key={check.id} value={check.id}>
                            {check.is_official === false ? '🔸 ' : ''}
                            {check.check_type === 'check' ? 'Çek' : 'Senet'} #{check.check_number || check.id} - 
                            {check.received_from || 'Bilinmiyor'} - 
                            {check.currency === 'TRY' ? '₺' : check.currency === 'EUR' ? '€' : '$'}
                            {Number(check.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            {check.is_official === false ? ' (Gayrıresmi)' : ''}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                  {selectedCheckId && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Alert severity="info" sx={{ flex: 1 }}>
                        Seçili çek tedarikçiye verilecek ve çek-senet kasasından çıkacaktır.
                      </Alert>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => setConvertCheckDialogOpen(true)}
                      >
                        Çevir
                      </Button>
                    </Box>
                  )}
                </Grid>
              </>
            )}

            <Grid size={{ xs: 12, sm: 6, }}>
              <TextField
                fullWidth
                label="Ödeme Tarihi"
                type="date"
                value={newPayment.payment_date}
                onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                slotProps={{
                  inputLabel: { shrink: true }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, }}>
              <TextField
                fullWidth
                label="Açıklama (Opsiyonel)"
                multiline
                rows={2}
                value={newPayment.description}
                onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                placeholder="Ödeme ile ilgili notlar..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>İptal</Button>
          <Button onClick={handleAddPayment} variant="contained" disabled={loading || !newPayment.amount}>
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>Tedarikçi Düzenle</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Tedarikçi Adı"
                value={supplier?.name || ''}
                onChange={(e) => setSupplier(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Telefon"
                value={supplier?.phone || ''}
                onChange={(e) => setSupplier(prev => prev ? { ...prev, phone: e.target.value } : null)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={supplier?.email || ''}
                onChange={(e) => setSupplier(prev => prev ? { ...prev, email: e.target.value } : null)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Adres"
                multiline
                rows={1}
                value={supplier?.address || ''}
                onChange={(e) => setSupplier(prev => prev ? { ...prev, address: e.target.value } : null)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>İptal</Button>
          <Button onClick={handleEditSupplier} variant="contained" disabled={loading}>
            {loading ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Purchase Dialog */}
      <Dialog
        open={purchaseDialogOpen}
        onClose={() => setPurchaseDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>Yeni Alım Ekle</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Alım Tarihi */}
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                label="Alım Tarihi"
                type="date"
                value={newPurchase.purchase_date}
                onChange={(e) => setNewPurchase({ ...newPurchase, purchase_date: e.target.value })}
                slotProps={{
                  inputLabel: { shrink: true }
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    fontSize: '1rem',
                    minHeight: '56px'
                  }
                }}
              />
            </Grid>
            {/* Para Birimi */}
            {/* Malzeme Ekleme */}
            <Grid size={{ xs: 12 }} >
              <Divider sx={{ my: 2 }}>
                <Typography variant="h6">Malzeme Ekle</Typography>
              </Divider>
            </Grid>
            <Grid size={{ xs: 12, md: 1.5 }}>

              <FormControl fullWidth size="medium">
                <InputLabel sx={{ fontSize: '1rem' }}>Para Birimi</InputLabel>
                <Select
                  value={newPurchase.currency}
                  label="Para Birimi"
                  onChange={(e) => setNewPurchase({ ...newPurchase, currency: e.target.value })}
                  sx={{
                    '& .MuiSelect-select': {
                      fontSize: '1rem',
                      py: 2
                    }
                  }}
                >
                  <MenuItem value="TRY" sx={{ fontSize: '1.1rem', py: 1.5 }}>TRY (₺)</MenuItem>
                  <MenuItem value="USD" sx={{ fontSize: '1.1rem', py: 1.5 }}>USD ($)</MenuItem>
                  <MenuItem value="EUR" sx={{ fontSize: '1.1rem', py: 1.5 }}>EUR (€)</MenuItem>
                </Select>
              </FormControl>
            </Grid>



            {/* Kategori Seçimi */}
            <Grid size={{ xs: 12, md: 1.5 }}>
              <FormControl fullWidth size="medium">
                <InputLabel sx={{ fontSize: '1rem' }}>Kategori</InputLabel>
                <Select
                  value={currentItem.category}
                  label="Kategori"
                  onChange={(e) => setCurrentItem({
                    ...currentItem,
                    category: e.target.value,
                    color_shade: '',
                    brand: '',
                    code: ''
                  })}
                  sx={{
                    '& .MuiSelect-select': {
                      fontSize: '1rem',
                      py: 2
                    }
                  }}
                >
                  <MenuItem value="Boya" sx={{ fontSize: '1rem', py: 1.5 }}>Boya</MenuItem>
                  <MenuItem value="Cila" sx={{ fontSize: '1rem', py: 1.5 }}>Cila</MenuItem>
                  <MenuItem value="Binder" sx={{ fontSize: '1rem', py: 1.5 }}>Binder</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Boya için Renk Tonu */}
            {currentItem.category === 'Boya' && (
              <Grid size={{ xs: 12, md: 2 }}>

                <TextField
                  fullWidth
                  label="Renk Tonu"
                  value={currentItem.color_shade}
                  onChange={(e) => setCurrentItem({ ...currentItem, color_shade: e.target.value })}
                  placeholder="Örn: Açık Kahverengi"
                  InputProps={{
                    sx: { fontSize: '1rem', minHeight: '40px' }
                  }}
                  InputLabelProps={{
                    sx: { fontSize: '1rem' }
                  }}
                />
              </Grid>
            )}

            {/* Cila için Firma */}
            {/* Cila için Firma alanı kaldırıldı - tedarikçiden otomatik alınıyor */}

            {/* Binder için Kod (Firma alanı kaldırıldı - tedarikçiden otomatik alınıyor) */}
            {currentItem.category === 'Binder' && (
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField
                  fullWidth
                  label="Kod"
                  value={currentItem.code}
                  onChange={(e) => setCurrentItem({ ...currentItem, code: e.target.value })}
                  placeholder="Örn: B-100"
                  InputProps={{
                    sx: { fontSize: '1rem', minHeight: '40px' }
                  }}
                  InputLabelProps={{
                    sx: { fontSize: '1rem' }
                  }}
                />
              </Grid>
            )}

            {/* Miktar ve Fiyat */}
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                fullWidth
                label="Miktar (kg)"
                value={currentItem.quantity}
                onChange={(e) => setCurrentItem({ ...currentItem, quantity: formatInputNumber(e.target.value) })}
                InputProps={{
                  sx: { fontSize: '1rem', minHeight: '40px' }
                }}
                InputLabelProps={{
                  sx: { fontSize: '1rem' }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                fullWidth
                label="Birim Fiyat"
                value={currentItem.unit_price}
                onChange={(e) => setCurrentItem({ ...currentItem, unit_price: formatDecimalNumber(e.target.value) })}
                placeholder="Örn: 2.5"
                helperText="Küsuratlı sayı girebilirsiniz (Örn: 2.5)"
                InputProps={{
                  sx: { fontSize: '1rem', minHeight: '40px' }
                }}
                InputLabelProps={{
                  sx: { fontSize: '1rem' }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }} >
              <Button
                fullWidth
                variant="outlined"
                onClick={handleAddItem}
                sx={{ height: '60px', fontSize: '1.1rem' }}
              >
                Ekle
              </Button>
            </Grid>

            {/* Eklenen Ürünler */}
            {newPurchase.items.length > 0 && (
              <>
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="h6">Eklenen Malzemeler</Typography>
                  </Divider>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Malzeme</TableCell>
                          <TableCell align="right">Adet</TableCell>
                          <TableCell align="right">Birim Fiyat</TableCell>
                          <TableCell align="right">Toplam</TableCell>
                          <TableCell align="center">İşlem</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {newPurchase.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell align="right">{item.quantity.toLocaleString('tr-TR')}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(item.unit_price, newPurchase.currency)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(item.total_price, newPurchase.currency)}
                            </TableCell>
                            <TableCell align="center">
                              <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)}>
                                <Delete />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} align="right" sx={{ fontWeight: 600 }}>
                            Genel Toplam:
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {formatCurrency(calculateTotal(), newPurchase.currency)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </>
            )}

            {/* Açıklama */}
            <Grid size={{ xs: 12, }}>
              <TextField
                fullWidth
                label="Açıklama (Opsiyonel)"
                multiline
                rows={2}
                value={newPurchase.notes}
                onChange={(e) => setNewPurchase({ ...newPurchase, notes: e.target.value })}
                placeholder="Alım ile ilgili notlar..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurchaseDialogOpen(false)}>İptal</Button>
          <Button
            onClick={handleSavePurchase}
            variant="contained"
            disabled={loading || newPurchase.items.length === 0}
          >
            {loading ? 'Kaydediliyor...' : `Alımı Kaydet (${formatCurrency(calculateTotal(), newPurchase.currency)})`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* YENİ: Alım Detay Modalı
        'SaleDetailModal'dan kopyalayıp 'PurchaseDetailModal' olarak yeniden oluşturduğunuzu
        ve 'purchaseId' prop'u aldığını varsayıyoruz.
      */}
      <PurchaseDetailModal
        open={viewingPurchaseId !== null}
        onClose={() => setViewingPurchaseId(null)}
        purchaseId={viewingPurchaseId}
      />
      {/* Snackbar for notifications */}
      {/* Convert Check Dialog */}
      <Dialog open={convertCheckDialogOpen} onClose={() => setConvertCheckDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Çek/Senet Çevir</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Alert severity="info">
              Çeki farklı bir para birimine çevirerek ödeme yapabilirsiniz.
            </Alert>

            {selectedCheckId && (() => {
              const selectedCheck = availableChecks.find(c => c.id === selectedCheckId);
              return selectedCheck ? (
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Orijinal Çek
                  </Typography>
                  <Typography variant="body2">
                    {selectedCheck.check_type === 'check' ? 'Çek' : 'Senet'} #{selectedCheck.check_number || selectedCheck.id}
                  </Typography>
                  <Typography variant="body2">
                    {selectedCheck.currency === 'TRY' ? '₺' : selectedCheck.currency === 'EUR' ? '€' : '$'}
                    {Number(selectedCheck.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
              ) : null;
            })()}

            <FormControl fullWidth>
              <InputLabel>Çevrilecek Para Birimi</InputLabel>
              <Select
                value={convertedCurrency}
                label="Çevrilecek Para Birimi"
                onChange={(e) => setConvertedCurrency(e.target.value)}
              >
                <MenuItem value="TRY">₺ Türk Lirası</MenuItem>
                <MenuItem value="USD">$ Amerikan Doları</MenuItem>
                <MenuItem value="EUR">€ Euro</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Çevrilmiş Tutar"
              value={convertedAmount}
              onChange={(e) => {
                const formatted = formatDecimalInputNumber(e.target.value);
                setConvertedAmount(formatted);
              }}
              helperText="Çekin yeni para birimindeki karşılığını girin"
              placeholder="Örn: 10,000.50"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConvertCheckDialogOpen(false)}>İptal</Button>
          <Button 
            onClick={() => {
              // Formatı parse et: virgül binlik ayıraç, nokta ondalık ayıraç
              const parsedAmount = parseFloat(convertedAmount.replace(/,/g, ''));
              if (convertedAmount && parsedAmount > 0) {
                setNewPayment({
                  ...newPayment,
                  amount: convertedAmount,
                  currency: convertedCurrency,
                });
                setConvertCheckDialogOpen(false);
                setSnackbar({ 
                  open: true, 
                  message: `Çek ${convertedCurrency} cinsinden çevrildi`, 
                  severity: 'success' 
                });
              }
            }}
            variant="contained"
            disabled={!convertedAmount || parseFloat(convertedAmount.replace(/,/g, '')) <= 0}
          >
            Çevir
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box >
  );
};

export default SupplierDetail;