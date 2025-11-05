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
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import { Customer, Product } from '../../main/database/models';
import jsPDF from 'jspdf';
import { formatDate, formatDateForInput, getNowISO } from '../utils/dateUtils';
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

  // Tarih filtresi - Default: Bugünden 1 ay öncesi ile bugün
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  };

  const getDefaultEndDate = () => {
    return new Date().toISOString().split('T')[0];
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
        if (startDate && endDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);

          supplierPurchases = supplierPurchases.filter((purchase: any) => {
            const purchaseDate = new Date(purchase.purchase_date || purchase.date || purchase.created_at);
            return purchaseDate >= start && purchaseDate <= end;
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
          currency: payment.currency || 'TRY'
        }));

        // Tarih filtresini uygula
        if (startDate && endDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);

          allPayments = allPayments.filter((payment: any) => {
            const paymentDate = new Date(payment.payment_date || payment.date || payment.created_at);
            return paymentDate >= start && paymentDate <= end;
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
  }, [id]);

  // Tarih filtresi değiştiğinde alımları yeniden yükle
  useEffect(() => {
    if (id) {
      loadPurchases();
      calculatePreviousBalance();
      setPurchasePage(0); // Pagination'ı sıfırla
    }
  }, [startDate, endDate]);

  const handleAddPayment = async () => {
    if (!supplier || !newPayment.amount) return;

    setLoading(true);
    try {
      const paymentData = {
        customer_id: supplier.id!,
        amount: parseFloat(newPayment.amount.replace(/,/g, '')),
        currency: newPayment.currency,
        payment_type: newPayment.payment_method,
        payment_date: newPayment.payment_date, // Kullanıcının seçtiği tarih
        notes: newPayment.description || undefined,
      };

      const response = await dbAPI.createPayment(paymentData);
      if (response.success) {
        // Kasadan ödeme tutarını düş
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

        setSnackbar({ open: true, message: 'Ödeme başarıyla yapıldı ve kasadan düşürüldü', severity: 'success', });
        setPaymentDialogOpen(false);
        setNewPayment({
          amount: '',
          currency: 'TRY',
          payment_method: 'cash',
          description: '',
          payment_date: new Date().toISOString().split('T')[0],
        });
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

  // Sayı formatlama fonksiyonları
  const formatNumberWithCommas = (value: string): string => {
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

    setLoading(true);
    try {
      const totalAmount = calculateTotal();

      const purchaseData = {
        supplier_id: supplier.id!,
        total_amount: totalAmount,
        currency: newPurchase.currency,
        notes: newPurchase.notes,
        items: newPurchase.items,
        purchase_date: new Date(newPurchase.purchase_date).toISOString(),
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
        purchase_date: new Date().toISOString().split('T')[0],
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
            }).join(', ');
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

    // Bu ayki ödemeleri filtrele
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM formatı
    const thisMonthPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.payment_date || payment.date || payment.created_at || '');
      const paymentMonth = paymentDate.toISOString().substring(0, 7);
      return paymentMonth === currentMonth;
    });

    // Ödeme toplamlarını hesapla (bu ay)
    const paymentTotals = { TRY: 0, USD: 0, EUR: 0 };
    thisMonthPayments.forEach(payment => {
      const amount = Number(payment.amount) || 0;
      if (payment.currency === 'USD') {
        paymentTotals.USD += amount;
      } else if (payment.currency === 'EUR') {
        paymentTotals.EUR += amount;
      } else {
        paymentTotals.TRY += amount;
      }
    });

    const paymentsTableData = thisMonthPayments.slice(0, 10).map(payment => {
      const paymentTypeText = payment.payment_type === 'cash' ? 'Nakit' :
        payment.payment_type === 'card' ? 'Kart' :
          payment.payment_type === 'transfer' ? 'Havale' :
            payment.payment_type === 'check' ? 'Cek' : 'Diger';
      const currencySymbol = payment.currency === 'TRY' ? 'TL' : payment.currency === 'USD' ? 'USD' : 'EUR';

      return [
        new Date(payment.payment_date || payment.date || payment.created_at || '').toLocaleDateString('tr-TR'),
        paymentTypeText,
        `${formatNumber(payment.amount)} ${currencySymbol}`,
        toAscii(payment.description || '-')
      ];
    });

    // Toplam satırını ekle
    if (paymentsTableData.length > 0) {
      const totalText = [
        paymentTotals.TRY > 0 ? `TL ${formatNumber(paymentTotals.TRY)}` : '',
        paymentTotals.USD > 0 ? `USD ${formatNumber(paymentTotals.USD)}` : '',
        paymentTotals.EUR > 0 ? `EUR ${formatNumber(paymentTotals.EUR)}` : ''
      ].filter(t => t).join(' | ');

      paymentsTableData.push(['', 'TOPLAM', totalText, '']);
    }

    autoTable(doc, {
      startY: finalY + 13,
      head: [['Tarih', 'Odeme Tipi', 'Tutar', 'Notlar']],
      body: paymentsTableData.length > 0 ? paymentsTableData : [['Kayit bulunamadi', '', '', '']],
      theme: 'striped',
      headStyles: {
        fillColor: [174, 96, 39],
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
        <IconButton onClick={() => navigate('/suppliers')} size="large">
          <ArrowBack />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
            {supplier.name}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Tedarikçi Detayları
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<PictureAsPdf />}
          onClick={handleDownloadPDF}
          size="large"
          color="error"
          sx={{ mr: 1 }}
        >
          PDF İndir
        </Button>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => setEditDialogOpen(true)}
        >
          Düzenle
        </Button>
      </Box>

      {/* Supplier Info Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 8, }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
                  <Business />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {supplier.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tedarikçi
                  </Typography>
                </Box>
              </Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, }}>
                  <Typography variant="body2" color="text.secondary">Telefon</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {supplier.phone || 'Belirtilmemiş'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, }}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {supplier.email || 'Belirtilmemiş'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, }}>
                  <Typography variant="body2" color="text.secondary">Adres</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {supplier.address || 'Belirtilmemiş'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4, }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Bakiye Durumu
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Pozitif: Tedarikçiye borçluyuz | Negatif: Tedarikçi borçlu
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={formatCurrency(balance.balanceTRY, 'TRY')}
                  color={getBalanceColor(balance.balanceTRY) as any}
                  sx={{ mb: 1, mr: 1 }}
                />
                <Chip
                  label={formatCurrency(balance.balanceUSD, 'USD')}
                  color={getBalanceColor(balance.balanceUSD) as any}
                  sx={{ mb: 1, mr: 1 }}
                />
                <Chip
                  label={formatCurrency(balance.balanceEUR, 'EUR')}
                  color={getBalanceColor(balance.balanceEUR) as any}
                  sx={{ mb: 1 }}
                />
              </Box>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Add />}
                onClick={() => setPaymentDialogOpen(true)}
              >
                Ödeme Yap
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Content */}
      <Grid container spacing={3}>
        {/* Purchase History */}
        <Grid size={{ xs: 12, md: 6 }} >
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ShoppingCart sx={{ mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Alım Geçmişi
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setPurchaseDialogOpen(true)}
                >
                  Alım Yap
                </Button>
              </Box>

              {/* Tarih Filtresi */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="Başlangıç"
                  type="date"
                  size="small"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Bitiş"
                  type="date"
                  size="small"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ flex: 1 }}
                />
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tarih</TableCell>
                      <TableCell>Tutar</TableCell>
                      <TableCell align="center">İşlem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchases.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          Henüz alım kaydı bulunmuyor
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {purchases
                          .slice(purchasePage * rowsPerPage, purchasePage * rowsPerPage + rowsPerPage)
                          .map((purchase) => (
                            <TableRow key={purchase.id} hover>
                              <TableCell
                                sx={{ cursor: 'pointer' }}
                                onClick={() => handlePurchaseRowClick(purchase)}
                              >
                                {(() => {
                                  try {
                                    const dateValue = purchase.purchase_date || purchase.date || purchase.created_at;
                                    if (!dateValue) return 'Tarih Belirtilmemiş';
                                    const date = new Date(dateValue);
                                    return isNaN(date.getTime()) ? 'Geçersiz Tarih' : date.toLocaleDateString('tr-TR');
                                  } catch (error) {
                                    return 'Geçersiz Tarih';
                                  }
                                })()}
                              </TableCell>
                              <TableCell
                                sx={{ cursor: 'pointer' }}
                                onClick={() => handlePurchaseRowClick(purchase)}
                              >
                                {formatCurrency(purchase.total_amount, purchase.currency)}
                              </TableCell>
                              <TableCell align="center">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePurchase(purchase.id);
                                  }}
                                  title="Sil"
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
                                <TableCell colSpan={3} sx={{ py: 1 }} />
                              </TableRow>
                              <TableRow sx={{ bgcolor: 'action.hover' }}>
                                <TableCell sx={{ fontWeight: 600 }}>
                                  Önceki Bakiye ({startDate} öncesi)
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>
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
                                <TableCell></TableCell>
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
        </Grid>

        {/* Payment History */}
        <Grid size={{ xs: 12, md: 6, }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Payment sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Ödeme Geçmişi
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tarih</TableCell>
                      <TableCell>Tutar</TableCell>
                      <TableCell>Uygulanan</TableCell>
                      <TableCell>Yöntem</TableCell>
                      <TableCell align="center">İşlem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          Henüz ödeme kaydı bulunmuyor
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {(() => {
                          // Ödemeleri işlerken önceki bakiyeyi takip et
                          let remainingPrevBalanceTRY = previousBalance.TRY;
                          let remainingPrevBalanceUSD = previousBalance.USD;
                          let remainingPrevBalanceEUR = previousBalance.EUR;

                          return payments
                            .slice(paymentPage * rowsPerPage, paymentPage * rowsPerPage + rowsPerPage)
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
                                <TableRow key={payment.id} hover>
                                  <TableCell>
                                    {(() => {
                                      try {
                                        const dateValue = payment.payment_date || payment.date || payment.created_at;
                                        if (!dateValue) return 'Tarih Belirtilmemiş';
                                        const date = new Date(dateValue);
                                        return isNaN(date.getTime()) ? 'Geçersiz Tarih' : date.toLocaleDateString('tr-TR');
                                      } catch (error) {
                                        return 'Geçersiz Tarih';
                                      }
                                    })()}
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                                      -{currencySymbol}{payment.amount.toLocaleString('tr-TR')}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    {appliedToPrevious > 0 && appliedToCurrent > 0 ? (
                                      <Box>
                                        <Chip label={`Önceki: ${currencySymbol}${appliedToPrevious.toLocaleString('tr-TR')}`} size="small" color="warning" sx={{ mb: 0.5, display: 'block' }} />
                                        <Chip label={`Bu Dönem: ${currencySymbol}${appliedToCurrent.toLocaleString('tr-TR')}`} size="small" color="info" />
                                      </Box>
                                    ) : appliedToPrevious > 0 ? (
                                      <Chip label="Önceki Bakiye" size="small" color="warning" />
                                    ) : (
                                      <Chip label="Bu Dönem" size="small" color="info" />
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={payment.payment_type === 'cash' ? 'Nakit' :
                                        payment.payment_type === 'card' ? 'Kart' :
                                          payment.payment_type === 'transfer' ? 'Banka Transferi' :
                                            payment.payment_type === 'check' ? 'Çek' :
                                              payment.payment_type || 'Belirtilmemiş'}
                                      size="small"
                                      color="primary"
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeletePayment(payment.id)}
                                      title="Sil"
                                    >
                                      <Delete />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              );
                            });
                        })()}
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
        </Grid>
      </Grid>

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
                  const value = e.target.value.replace(/[^\d,]/g, '');
                  setNewPayment({ ...newPayment, amount: value });
                }}
                helperText="Ödenen tutarı giriniz"
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
                  onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value })}
                >
                  <MenuItem value="cash">Nakit</MenuItem>
                  <MenuItem value="card">Kart</MenuItem>
                  <MenuItem value="transfer">Banka Transferi</MenuItem>
                  <MenuItem value="check">Çek</MenuItem>
                </Select>
              </FormControl>
            </Grid>
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
                onChange={(e) => setCurrentItem({ ...currentItem, quantity: formatNumberWithCommas(e.target.value) })}
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