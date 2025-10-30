import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Card,
  CardContent,
  Avatar,
  Chip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  History as HistoryIcon,
  Inventory as InventoryIcon,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import ProductMovementsModal from './ProductMovementsModal';
import Pagination from './common/Pagination';
import { dbAPI } from '../services/api';
import { Product, Category, Color } from '../../main/database/models';

interface NewProduct {
  category: string;
  color: string;
  stock_quantity: string;
  description: string;
  entry_date: string;
}

interface NewMaterial {
  category: 'Boya' | 'Cila' | 'Binder' | 'Kimyasal' | '';
  color_shade?: string;
  brand?: string;
  code?: string;
  stock_quantity: string;
  description: string;
}

const ProductManagement: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addMaterialDialogOpen, setAddMaterialDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Product[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Pagination states for Products (Deri Ürünleri)
  const [productsCurrentPage, setProductsCurrentPage] = useState(1);
  const [productsItemsPerPage, setProductsItemsPerPage] = useState(10);

  // Pagination states for Materials (Malzemeler)
  const [materialsCurrentPage, setMaterialsCurrentPage] = useState(1);
  const [materialsItemsPerPage, setMaterialsItemsPerPage] = useState(10);

  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [newProduct, setNewProduct] = useState<NewProduct>({
    category: '',
    color: '',
    stock_quantity: '',
    description: '',
    entry_date: new Date().toISOString().split('T')[0], // Bugünün tarihi
  });

  const [newMaterial, setNewMaterial] = useState<NewMaterial>({
    category: '',
    color_shade: '',
    brand: '',
    code: '',
    stock_quantity: '',
    description: '',
  });

  // Sayı formatlama fonksiyonları
  const formatNumberWithCommas = (value: string): string => {
    // Sadece rakam karakterlerini al
    const numericValue = value.replace(/[^\d]/g, '');

    // Eğer boşsa boş döndür
    if (!numericValue) return '';

    // Üç haneli ayraçlarla formatla
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const parseFormattedNumber = (value: string): number => {
    // Virgülleri kaldır ve sayıya çevir
    return parseInt(value.replace(/,/g, '')) || 0;
  };

  // Güvenli toLocaleString
  const safeToLocaleString = (value: any): string => {
    const num = Number(value);
    return !isNaN(num) && value !== null && value !== undefined && value !== '' ? num.toLocaleString('tr-TR') : '0';
  };


  // Kategoriler ve renkleri yükle
  const loadCategories = async () => {
    try {
      const response = await dbAPI.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadColors = async () => {
    try {
      const response = await dbAPI.getColors();
      if (response.success && response.data) {
        setColors(response.data);
      }
    } catch (error) {
      console.error('Error loading colors:', error);
    }
  };

  // Ürünleri yükle
  const loadProducts = async (page = productsCurrentPage, limit = productsItemsPerPage) => {
    setLoading(true);
    try {
      const productsResponse = await dbAPI.getProducts(page, limit);

      if (productsResponse.success && productsResponse.data) {
        const processedProducts = productsResponse.data.map((product: Product) => ({
          ...product,
          type: 'product' as const
        }));
        setProducts(processedProducts);
      } else {
        setSnackbar({ open: true, message: 'Ürünler yüklenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Ürünler yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Malzemeleri yükle
  const loadMaterials = async () => {
    setLoading(true);
    try {
      const materialsResponse = await dbAPI.getMaterials();

      if (materialsResponse.success && materialsResponse.data) {
        const processedMaterials = materialsResponse.data.map((material: Product) => ({
          ...material,
          type: 'material' as const
        }));
        setMaterials(processedMaterials);
      } else {
        setSnackbar({ open: true, message: 'Malzemeler yüklenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Malzemeler yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadMaterials();
    loadCategories();
    loadColors();
  }, []);

  const handleOpenModal = (product: Product) => {
    console.log('🔓 Opening modal for:', { id: product.id, type: (product as any)?.type, category: product.category });
    setSelectedProduct(product);
    setModalOpen(true);
  };

  // Ürün veya malzeme tipini belirle
  const getItemType = (item: Product): 'product' | 'material' => {
    const type = (item as any)?.type === 'material' ? 'material' : 'product';
    console.log('🎯 getItemType:', { id: item.id, detectedType: type, rawType: (item as any)?.type });
    return type;
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProduct(null);
  };

  // Pagination handlers for Products
  const handleProductsPageChange = (page: number) => {
    setProductsCurrentPage(page);
  };

  const handleProductsItemsPerPageChange = (newItemsPerPage: number) => {
    setProductsItemsPerPage(newItemsPerPage);
    setProductsCurrentPage(1);
  };

  // Pagination handlers for Materials
  const handleMaterialsPageChange = (page: number) => {
    setMaterialsCurrentPage(page);
  };

  const handleMaterialsItemsPerPageChange = (newItemsPerPage: number) => {
    setMaterialsItemsPerPage(newItemsPerPage);
    setMaterialsCurrentPage(1);
  };

  // Search ve filter değiştiğinde sayfa 1'e dön
  useEffect(() => {
    setProductsCurrentPage(1);
    setMaterialsCurrentPage(1);
  }, [searchTerm, filterCategory, filterColor]);

  const handleAddProduct = async () => {
    console.log('Form data:', newProduct);

    setLoading(true);
    try {
      const productData = {
        name: newProduct.category || 'Deri',
        category: newProduct.category,
        color: undefined, // Renk artık yok
        stock_quantity: newProduct.stock_quantity ? parseFormattedNumber(newProduct.stock_quantity) : 0,
        description: newProduct.description || undefined
      };

      const response = await dbAPI.createProduct(productData);

      if (response.success) {
        // Yeni ürün başarıyla eklendi, şimdi stok hareketi oluştur
        const productId = response.data?.id;
        const stockQuantity = parseFormattedNumber(newProduct.stock_quantity) || 0;
        const merged = (response as any).merged || false;
        const currentStock = response.data?.stock_quantity || 0;

        if (stockQuantity > 0 && productId) {
          // Stok hareketi kaydı oluştur
          const previousStock = merged ? (currentStock - stockQuantity) : 0;
          const movementData = {
            product_id: productId,
            movement_type: 'in',
            quantity: stockQuantity,
            previous_stock: previousStock,
            new_stock: currentStock,
            reference_type: merged ? 'stock_addition' : 'initial_stock',

            notes: newProduct.description || merged
              ? `Stok ekleme - ${productData.category}`
              :`İlk stok girişi - ${productData.category}`,
            user: 'Sistem Kullanıcısı',
            created_at: newProduct.entry_date ? new Date(newProduct.entry_date).toISOString() : new Date().toISOString(),
          };

          try {
            await dbAPI.createStockMovement(movementData);
          } catch (error) {
            console.error('Stok hareketi oluşturulamadı:', error);
          }
        }

        setSnackbar({ open: true, message: 'ürün başarıyla eklendi', severity: 'success' });
        setAddDialogOpen(false);
        // Form temizle
        setNewProduct({
          category: '',
          color: '', // Artık kullanılmıyor ama interface'de var
          stock_quantity: '',
          description: '',
          entry_date: new Date().toISOString().split('T')[0],
        });
        await loadProducts();
      } else {
        console.error('API Error:', response.error);
        setSnackbar({ open: true, message: response.error || 'Ürün eklenemedi', severity: 'error' });
      }
    } catch (error) {
      console.error('Exception:', error);
      // Güvenli hata mesajı oluşturma
      let errorMessage = 'Ürün eklenirken hata oluştu';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage += ': ' + error.message;
      } else if (typeof error === 'string') {
        errorMessage += ': ' + error;
      }
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async () => {
    setLoading(true);
    try {
      const stockQuantity = parseFormattedNumber(newMaterial.stock_quantity) || 0;

      if (!newMaterial.category || stockQuantity <= 0) {
        setSnackbar({ open: true, message: 'Lütfen kategori ve stok miktarı alanlarını doldurun', severity: 'error' });
        setLoading(false);
        return;
      }

      // Kategori bazında zorunlu alan kontrolü
      if (newMaterial.category === 'Boya' && !newMaterial.color_shade) {
        setSnackbar({ open: true, message: 'Boya için renk tonu gerekli', severity: 'error' });
        setLoading(false);
        return;
      }
      if (newMaterial.category === 'Cila' && !newMaterial.brand) {
        setSnackbar({ open: true, message: 'Cila için firma gerekli', severity: 'error' });
        setLoading(false);
        return;
      }
      if (newMaterial.category === 'Binder' && (!newMaterial.code || !newMaterial.brand)) {
        setSnackbar({ open: true, message: 'Binder için kod ve firma gerekli', severity: 'error' });
        setLoading(false);
        return;
      }
      // Kimyasal için zorunlu alan yok, opsiyonel

      // Malzeme adını oluştur
      const materialName = `${newMaterial.category}${newMaterial.color_shade ? ` - ${newMaterial.color_shade}` : ''}${newMaterial.code ? ` - ${newMaterial.code}` : ''}`;

      // Önce aynı malzeme var mı kontrol et
      const allMaterials = materials;
      let existingMaterial = allMaterials.find((m: Product) => {
        if (newMaterial.category === 'Boya') {
          return m.category === newMaterial.category && m.color_shade === newMaterial.color_shade;
        } else if (newMaterial.category === 'Cila') {
          return m.category === newMaterial.category && m.brand === newMaterial.brand;
        } else if (newMaterial.category === 'Binder') {
          return m.category === newMaterial.category && m.code === newMaterial.code && m.brand === newMaterial.brand;
        } else if (newMaterial.category === 'Kimyasal') {
          // Kimyasal için kod ve firma varsa kontrol et, yoksa sadece kategori
          if (newMaterial.code && newMaterial.brand) {
            return m.category === newMaterial.category && m.code === newMaterial.code && m.brand === newMaterial.brand;
          } else if (newMaterial.code) {
            return m.category === newMaterial.category && m.code === newMaterial.code;
          } else if (newMaterial.brand) {
            return m.category === newMaterial.category && m.brand === newMaterial.brand;
          }
        }
        return false;
      });

      if (existingMaterial && existingMaterial.id) {
        // Mevcut malzemenin stoğunu güncelle
        const newStock = (existingMaterial.stock_quantity || 0) + stockQuantity;
        const updateResponse = await dbAPI.updateMaterial(existingMaterial.id, {
          stock_quantity: newStock
        });

        if (updateResponse.success && existingMaterial.id) {
          // Malzeme stok hareketi oluştur
          const movementData = {
            material_id: existingMaterial.id,
            movement_type: 'in' as const,
            quantity: stockQuantity,
            previous_stock: existingMaterial.stock_quantity || 0,
            new_stock: newStock,
            reference_type: 'manual_adjustment' as const,
            notes: `Stok ekleme - ${materialName}`,
            user: 'Sistem Kullanıcısı',
          };

          try {
            await dbAPI.createMaterialMovement(movementData);
          } catch (error) {
            console.error('Malzeme stok hareketi oluşturulamadı:', error);
          }

          setSnackbar({ open: true, message: 'Mevcut malzemenin stoğu güncellendi', severity: 'success' });
        } else {
          const errorMsg = updateResponse.error || 'Stok güncellenemedi';
          console.error('Güncelleme hatası:', JSON.stringify(updateResponse, null, 2));
          throw new Error(errorMsg);
        }
      } else {
        // Yeni malzeme oluştur
        const materialData = {
          name: materialName,
          category: newMaterial.category,
          color_shade: newMaterial.color_shade || undefined,
          brand: newMaterial.brand || undefined,
          code: newMaterial.code || undefined,
          stock_quantity: stockQuantity,
          unit: 'kg',
          description: newMaterial.description || undefined
        };

        console.log('Malzeme verisi:', materialData);
        const response = await dbAPI.createMaterial(materialData);
        console.log('Malzeme ekleme yanıtı:', response);

        if (response.success) {
          // Yeni malzeme başarıyla eklendi, şimdi stok hareketi oluştur
          const productId = response.data?.id;

          if (stockQuantity > 0 && productId) {
            const movementData = {
              material_id: productId,
              movement_type: 'in' as const,
              quantity: stockQuantity,
              previous_stock: 0,
              new_stock: stockQuantity,
              reference_type: 'initial_stock' as const,
              notes: `İlk stok girişi - ${materialName}`,
              user: 'Sistem Kullanıcısı',
            };

            try {
              await dbAPI.createMaterialMovement(movementData);
            } catch (error) {
              console.error('Malzeme stok hareketi oluşturulamadı:', error);
            }
          }

          setSnackbar({ open: true, message: 'Yeni malzeme başarıyla eklendi', severity: 'success' });
        } else {
          throw new Error('Malzeme eklenemedi');
        }
      }

      setAddMaterialDialogOpen(false);
      setNewMaterial({
        category: '',
        color_shade: '',
        brand: '',
        code: '',
        stock_quantity: '',
        description: '',
      });

      // Kısa bir bekleme sonrası yeniden yükle
      setTimeout(async () => {
        await loadProducts();
        await loadMaterials();
      }, 500);
    } catch (error) {
      // Güvenli hata mesajı oluşturma
      let errorMessage = 'Malzeme eklenirken hata oluştu';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage += ': ' + error.message;
      } else if (typeof error === 'string') {
        errorMessage += ': ' + error;
      }
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    try {
      const isMaterial = (selectedProduct as any)?.type === 'material';

      // Mevcut ürün/malzeme bilgilerini al
      const originalProduct = isMaterial
        ? materials.find(m => m.id === selectedProduct.id)
        : products.find(p => p.id === selectedProduct.id);
      const originalStock = originalProduct?.stock_quantity || 0;
      const newStock = selectedProduct.stock_quantity || 0;
      const stockDifference = newStock - originalStock;

      // Ürün veya malzeme güncelle
      const response = isMaterial
        ? await dbAPI.updateMaterial(selectedProduct.id!, selectedProduct)
        : await dbAPI.updateProduct(selectedProduct.id!, selectedProduct);

      if (response.success) {
        // Eğer stok miktarı değiştiyse, stok hareketi oluştur
        if (stockDifference !== 0) {
          if (isMaterial) {
            // Malzeme için material_movements kullan
            const movementData = {
              material_id: selectedProduct.id!,
              movement_type: stockDifference > 0 ? 'in' : 'out',
              quantity: Math.abs(stockDifference),
              previous_stock: originalStock,
              new_stock: newStock,
              reference_type: 'adjustment',
              notes: `Stok düzeltmesi - ${selectedProduct.category} ${selectedProduct.color_shade || ''} (${stockDifference > 0 ? '+' : ''}${stockDifference})`,
              user: 'Sistem Kullanıcısı',
            };

            try {
              await dbAPI.createMaterialMovement(movementData);
            } catch (error) {
              console.error('Malzeme stok hareketi oluşturulamadı:', error);
            }
          } else {
            // Ürün için stock_movements kullan
            const movementData = {
              product_id: selectedProduct.id!,
              movement_type: stockDifference > 0 ? 'in' : 'out',
              quantity: Math.abs(stockDifference),
              previous_stock: originalStock,
              new_stock: newStock,
              reference_type: 'adjustment',
              notes: `Stok düzeltmesi - ${selectedProduct.category} ${selectedProduct.color || ''} (${stockDifference > 0 ? '+' : ''}${stockDifference})`,
              user: 'Sistem Kullanıcısı',
            };

            try {
              await dbAPI.createStockMovement(movementData);
            } catch (error) {
              console.error('Stok hareketi oluşturulamadı:', error);
            }
          }
        }

        setSnackbar({
          open: true,
          message: isMaterial ? 'Malzeme başarıyla güncellendi' : 'Ürün başarıyla güncellendi',
          severity: 'success'
        });
        setEditDialogOpen(false);
        setSelectedProduct(null);

        // Hem ürünleri hem malzemeleri yeniden yükle
        await loadProducts();
        await loadMaterials();
      } else {
        setSnackbar({
          open: true,
          message: response.error || (isMaterial ? 'Malzeme güncellenemedi' : 'Ürün güncellenemedi'),
          severity: 'error'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Güncelleme sırasında hata oluştu',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  //Ürün Silme Fonksiyonu

  const handleDeleteProduct = async () => {
    if (!selectedProduct) {
      console.log('selectedProduct null, işlem iptal edildi');
      setDeleteDialogOpen(false);
      return;
    }

    setLoading(true);

    try {
      // Malzeme mi ürün mü kontrol et
      const isMaterial = selectedProduct.type === 'material';
      const response = isMaterial
        ? await dbAPI.deleteMaterial(selectedProduct.id!)
        : await dbAPI.deleteProduct(selectedProduct.id!);

      if (response.success) {
        setSnackbar({
          open: true,
          message: `${isMaterial ? 'Malzeme' : 'Ürün'} başarıyla silindi`,
          severity: 'success'
        });
        setDeleteDialogOpen(false);
        setSelectedProduct(null);

        // Hem ürünleri hem malzemeleri yeniden yükle
        await loadProducts();
        await loadMaterials();
      } else {
        setSnackbar({
          open: true,
          message: response.error || `${isMaterial ? 'Malzeme' : 'Ürün'} silinemedi`,
          severity: 'error'
        });
        setDeleteDialogOpen(false);
        setSelectedProduct(null);
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      // Güvenli hata mesajı oluşturma
      let errorMessage = 'Silme işlemi sırasında hata oluştu';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage += ': ' + error.message;
      } else if (typeof error === 'string') {
        errorMessage += ': ' + error;
      }
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    } finally {
      setLoading(false);
    }
  };

  // Deri ürünlerini filtrele ve paginate et
  const allFilteredProducts = (products || []).filter(product => {
    if (!product) return false;
    const productName = `${product.category || ''} - ${product.color || ''}`;
    const matchesSearch = searchTerm === '' ||
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.color || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === '' || product.category === filterCategory;
    const matchesColor = filterColor === '' || product.color === filterColor;

    return matchesSearch && matchesCategory && matchesColor;
  });

  const productsStartIndex = (productsCurrentPage - 1) * productsItemsPerPage;
  const productsEndIndex = productsStartIndex + productsItemsPerPage;
  const filteredProducts = allFilteredProducts.slice(productsStartIndex, productsEndIndex);

  // Malzemeleri filtrele ve paginate et
  const allFilteredMaterials = (materials || []).filter(material => {
    if (!material) return false;
    const matchesSearch = searchTerm === '' ||
      (material.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.category || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const materialsStartIndex = (materialsCurrentPage - 1) * materialsItemsPerPage;
  const materialsEndIndex = materialsStartIndex + materialsItemsPerPage;
  const filteredMaterials = allFilteredMaterials.slice(materialsStartIndex, materialsEndIndex);

  const getStockStatus = (currentStock: number) => {
    if (currentStock === 0) return { label: 'Tükendi', color: 'error' };
    if (currentStock < 5) return { label: 'Kritik', color: 'error' };
    if (currentStock < 10) return { label: 'Düşük', color: 'warning' };
    return { label: 'Normal', color: 'success' };
  };

  const getColorDisplay = (colorName: string) => {
    // Renk verisi hem string hem de Color object array formatını destekle
    if (!colors || colors.length === 0 || typeof colors[0] === 'string') {
      // Eğer colors boş veya string array ise, varsayılan renk döndür
      return '#F5F5DC';
    }

    // Color object array formatı
    const color = colors.find(c => c.name === colorName);
    return color?.hex_code || '#F5F5DC';
  };

  return (
    <Box sx={{ mt: 2, mr: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Ürün Yönetimi
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Deri stok envanterinizi yönetin
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 4 }}>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <InventoryIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {filteredProducts.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Deri Ürünü
              </Typography>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
            <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
              <TrendingUp />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {(() => {
                  try {
                    const total = (products || []).reduce((sum, p) => sum + (Number(p?.stock_quantity) || 0), 0) || 0;
                    const materialTotal = (materials || []).reduce((sum, m) => sum + (Number(m?.stock_quantity) || 0), 0) || 0;
                    return safeToLocaleString(total + materialTotal) + ' adet';
                  } catch (e) {
                    return '0 adet';
                  }
                })()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Toplam Stok
              </Typography>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
            <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
              <InventoryIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {filteredMaterials.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Malzeme Türü
              </Typography>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
            <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
              <TrendingDown />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {(products || []).filter(p => (Number(p.stock_quantity) || 0) < 5).length +
                  (materials || []).filter(m => (Number(m.stock_quantity) || 0) < 5).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Düşük Stok
              </Typography>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
            <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
              <FilterListIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {new Set((products || []).map(p => p.category)).size}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Deri Türü
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Search and Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3, alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder="Ürün adı, kategori veya renk ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  minHeight: '56px',
                  fontSize: '1.1rem',
                },
                '& .MuiOutlinedInput-input': {
                  fontSize: '1.1rem',
                  fontWeight: 500,
                }
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl fullWidth variant="outlined">
              <InputLabel
                id="category-filter-label"
                sx={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                Deri Türü
              </InputLabel>
              <Select
                labelId="category-filter-label"
                value={filterCategory}
                label="Deri Türü"
                onChange={(e) => setFilterCategory(e.target.value)}
                sx={{
                  minHeight: '56px',
                  '& .MuiSelect-select': {
                    fontSize: '1.1rem',
                    fontWeight: 500,
                  }
                }}
              >
                <MenuItem value="">Tüm Deri Türleri</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category.id} value={category.name}>{category.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth variant="outlined">
              <InputLabel
                id="color-filter-label"
                sx={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                Renk
              </InputLabel>
              <Select
                labelId="color-filter-label"
                value={filterColor}
                label="Renk"
                onChange={(e) => setFilterColor(e.target.value)}
                sx={{
                  minHeight: '56px',
                  '& .MuiSelect-select': {
                    fontSize: '1.1rem',
                    fontWeight: 500,
                  }
                }}
              >
                <MenuItem value="">Tüm Renkler</MenuItem>
                {colors.map(color => (
                  <MenuItem key={color.id} value={color.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: color.hex_code || '#F5F5DC',
                          border: color.name === 'Beyaz' ? '1px solid #ccc' : 'none',
                        }}
                      />
                      {color.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              sx={{ minHeight: '56px' }}
              onClick={() => {
                setSearchTerm('');
                setFilterCategory('');
                setFilterColor('');
              }}
            >
              Temizle
            </Button>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              sx={{ minHeight: '56px' }}
              onClick={() => setAddDialogOpen(true)}
            >
              Ürün Ekle
            </Button>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<AddIcon />}
              sx={{ minHeight: '56px' }}
              onClick={() => setAddMaterialDialogOpen(true)}
            >
              Malzeme Ekle
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Deri Stok Listesi ({allFilteredProducts.length} ürün)
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Deri Türü</TableCell>
                  <TableCell align="right">Stok (Adet)</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(filteredProducts || []).map((product) => {
                  if (!product) return null; // Null ürünleri atla
                  const stockStatus = getStockStatus(Number(product?.stock_quantity) || 0);
                  return (
                    <TableRow key={product.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{product.category}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {(() => {
                          try {
                            return safeToLocaleString(product?.stock_quantity) + ' adet';
                          } catch (e) {
                            return '0 adet';
                          }
                        })()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={stockStatus.label}
                          color={stockStatus.color as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenModal(product)}
                          title="Stok Geçmişi"
                        >
                          <HistoryIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          title="Düzenle"
                          onClick={() => { setSelectedProduct(product); setEditDialogOpen(true); }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          title="Sil"
                          onClick={() => { setSelectedProduct(product); setDeleteDialogOpen(true); }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination for Products */}
          <Pagination
            currentPage={productsCurrentPage}
            totalPages={Math.ceil(allFilteredProducts.length / productsItemsPerPage)}
            totalItems={allFilteredProducts.length}
            itemsPerPage={productsItemsPerPage}
            onPageChange={handleProductsPageChange}
            onItemsPerPageChange={handleProductsItemsPerPageChange}
          />
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card sx={{ mt: 3, mb: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Malzeme Listesi ({allFilteredMaterials.length} malzeme)
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Malzeme Adı</TableCell>
                  <TableCell>Tür</TableCell>
                  <TableCell>Firma</TableCell>
                  <TableCell align="right">Stok (kg)</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(filteredMaterials || []).map((material) => {
                  if (!material) return null; // Null malzemeleri atla
                  const stockStatus = getStockStatus(Number(material?.stock_quantity) || 0);
                  return (
                    <TableRow key={material.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {material.name || `${material.category}${material.color ? ` - ${material.color}` : ''}`}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={material.category?.toUpperCase() || 'MALZEME'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {(material as any).supplier_name || '-'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {(() => {
                          try {
                            return safeToLocaleString(material?.stock_quantity) + ' kg';
                          } catch (e) {
                            return '0 kg';
                          }
                        })()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={stockStatus.label}
                          color={stockStatus.color as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenModal(material)}
                          title="Stok Geçmişi"
                        >
                          <HistoryIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          title="Düzenle"
                          onClick={() => {
                            setSelectedProduct(material);
                            setEditDialogOpen(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          title="Sil"
                          onClick={() => {
                            setSelectedProduct(material);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(filteredMaterials || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      {loading ? 'Yükleniyor...' : 'Malzeme bulunamadı'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination for Materials */}
          <Pagination
            currentPage={materialsCurrentPage}
            totalPages={Math.ceil(allFilteredMaterials.length / materialsItemsPerPage)}
            totalItems={allFilteredMaterials.length}
            itemsPerPage={materialsItemsPerPage}
            onPageChange={handleMaterialsPageChange}
            onItemsPerPageChange={handleMaterialsItemsPerPageChange}
          />
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>Yeni Ürün Ekle</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <FormControl fullWidth>
                  <InputLabel>Deri Türü</InputLabel>
                  <Select
                    value={newProduct.category}
                    label="Deri Türü"
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  >
                    {categories
                      .filter(cat => ['Keçi', 'Koyun'].includes(cat.name))
                      .map(category => (
                        <MenuItem key={category.id} value={category.name}>{category.name}</MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <TextField
                  fullWidth
                  label="Giriş Tarihi"
                  type="date"
                  value={newProduct.entry_date}
                  onChange={(e) => setNewProduct({ ...newProduct, entry_date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  helperText="Ürünün stoğa giriş tarihi"
                />
              </Box>
              <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                <TextField
                  fullWidth
                  label="Başlangıç Stok (Adet)"
                  type="text"
                  value={newProduct.stock_quantity}
                  onChange={(e) => {
                    const formatted = formatNumberWithCommas(e.target.value);
                    setNewProduct({ ...newProduct, stock_quantity: formatted });
                  }}
                  helperText="Stoğa eklenecek deri miktarını adet cinsinden giriniz (Örn: 1,000)"
                  placeholder="Örn: 1,000"
                />
              </Box>
            </Box>
            <TextField
              fullWidth
              label="Açıklama (Opsiyonel)"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              helperText="Ürün hakkında ek bilgiler"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddDialogOpen(false);
            setNewProduct({
              category: '',
              color: '',
              stock_quantity: '',
              description: '',
              entry_date: new Date().toISOString().split('T')[0],
            });
          }}>İptal</Button>
          <Button onClick={handleAddProduct} variant="contained" disabled={loading}>
            {loading ? 'Ekleniyor...' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>{(selectedProduct as any)?.type === 'material' ? 'Malzemeyi Düzenle' : 'Ürünü Düzenle'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {(selectedProduct as any)?.type === 'material' ? (
              /* Malzeme Düzenleme */
              <>
                <FormControl fullWidth>
                  <InputLabel>Kategori</InputLabel>
                  <Select
                    value={selectedProduct?.category || ''}
                    label="Kategori"
                    onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, category: e.target.value as any } : null)}
                  >
                    <MenuItem value="Boya">Boya</MenuItem>
                    <MenuItem value="Cila">Cila</MenuItem>
                    <MenuItem value="Binder">Binder</MenuItem>
                    <MenuItem value="Kimyasal">Kimyasal</MenuItem>
                  </Select>
                </FormControl>

                {/* Boya için Renk Tonu */}
                {selectedProduct?.category === 'Boya' && (
                  <TextField
                    fullWidth
                    label="Renk Tonu"
                    value={(selectedProduct as any)?.color_shade || ''}
                    onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, color_shade: e.target.value } as any : null)}
                    placeholder="Örn: Açık Kahverengi"
                  />
                )}

                {/* Cila için Firma */}
                {selectedProduct?.category === 'Cila' && (
                  <TextField
                    fullWidth
                    label="Firma"
                    value={(selectedProduct as any)?.brand || ''}
                    onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, brand: e.target.value } as any : null)}
                    placeholder="Örn: Sayerlack"
                  />
                )}

                {/* Binder için Kod ve Firma */}
                {selectedProduct?.category === 'Binder' && (
                  <>
                    <TextField
                      fullWidth
                      label="Kod"
                      value={(selectedProduct as any)?.code || ''}
                      onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, code: e.target.value } as any : null)}
                      placeholder="Örn: B-100"
                    />
                    <TextField
                      fullWidth
                      label="Firma"
                      value={(selectedProduct as any)?.brand || ''}
                      onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, brand: e.target.value } as any : null)}
                      placeholder="Örn: BASF"
                    />
                  </>
                )}

                {/* Kimyasal için Kod ve Firma */}
                {selectedProduct?.category === 'Kimyasal' && (
                  <>
                    <TextField
                      fullWidth
                      label="Kod"
                      value={(selectedProduct as any)?.code || ''}
                      onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, code: e.target.value } as any : null)}
                      placeholder="Örn: K-200"
                    />
                    <TextField
                      fullWidth
                      label="Firma"
                      value={(selectedProduct as any)?.brand || ''}
                      onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, brand: e.target.value } as any : null)}
                      placeholder="Örn: Clariant"
                    />
                  </>
                )}

                <TextField
                  fullWidth
                  label="Stok Miktarı (kg)"
                  type="text"
                  value={selectedProduct?.stock_quantity != null ? formatNumberWithCommas(selectedProduct.stock_quantity.toString()) : ''}
                  onChange={(e) => {
                    const formatted = formatNumberWithCommas(e.target.value);
                    const numericValue = parseFormattedNumber(formatted);
                    setSelectedProduct(prev => prev ? { ...prev, stock_quantity: numericValue } : null);
                  }}
                  helperText="Stok miktarını kg cinsinden giriniz"
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                />
              </>
            ) : (
              /* Ürün Düzenleme */
              <>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                    <FormControl fullWidth>
                      <InputLabel>Deri Türü</InputLabel>
                      <Select
                        value={selectedProduct?.category || ''}
                        label="Deri Türü"
                        onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, category: e.target.value as any } : null)}
                      >
                        {categories
                          .filter(cat => ['Keçi', 'Koyun'].includes(cat.name))
                          .map(cat => (
                            <MenuItem key={cat.id} value={cat.name}>{cat.name}</MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
                    <FormControl fullWidth>
                      <InputLabel>Deri Rengi</InputLabel>
                      <Select
                        value={selectedProduct?.color || ''}
                        label="Deri Rengi"
                        onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, color: e.target.value } : null)}
                      >
                        {colors.map(color => (
                          <MenuItem key={color.id} value={color.name}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: '50%',
                                  bgcolor: color.hex_code || '#F5F5DC',
                                  border: '1px solid rgba(0,0,0,0.2)',
                                }}
                              />
                              {color.name}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
                <TextField
                  fullWidth
                  label="Stok Miktarı (Adet)"
                  type="text"
                  value={selectedProduct?.stock_quantity != null ? formatNumberWithCommas(selectedProduct.stock_quantity.toString()) : ''}
                  onChange={(e) => {
                    const formatted = formatNumberWithCommas(e.target.value);
                    const numericValue = parseFormattedNumber(formatted);
                    setSelectedProduct(prev => prev ? { ...prev, stock_quantity: numericValue } : null);
                  }}
                  helperText="Stok miktarını adet cinsinden giriniz"
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>İptal</Button>
          <Button
            onClick={handleEditProduct}
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedProduct(null);
        }}
        disableEnforceFocus
      >
        <DialogTitle>Ürünü Sil</DialogTitle>
        <DialogContent>
          <Typography>
            "{selectedProduct?.name || `${selectedProduct?.category || 'Ürün'} - ${selectedProduct?.color || 'Renksiz'}`}" ürünü silmek istediğinizden emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Bu işlem geri alınamaz ve tüm stok hareketleri silinecektir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setSelectedProduct(null); // Kapatınca seçimi sıfırla
          }}>İptal</Button>
          <Button
            onClick={() => {
              console.log('Delete butonu tıklandı, işlem başlıyor');
              handleDeleteProduct();
            }}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Material Dialog */}
      <Dialog
        open={addMaterialDialogOpen}
        onClose={() => setAddMaterialDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>Yeni Malzeme Ekle</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Kategori</InputLabel>
              <Select
                value={newMaterial.category}
                label="Kategori"
                onChange={(e) => setNewMaterial({
                  ...newMaterial,
                  category: e.target.value as 'Boya' | 'Cila' | 'Binder' | 'Kimyasal',
                  color_shade: '',
                  brand: '',
                  code: ''
                })}
              >
                <MenuItem value="Boya">Boya</MenuItem>
                <MenuItem value="Cila">Cila</MenuItem>
                <MenuItem value="Binder">Binder</MenuItem>
                <MenuItem value="Kimyasal">Kimyasal</MenuItem>
              </Select>
            </FormControl>

            {/* Boya için Renk Tonu */}
            {newMaterial.category === 'Boya' && (
              <TextField
                fullWidth
                label="Renk Tonu *"
                value={newMaterial.color_shade || ''}
                onChange={(e) => setNewMaterial({ ...newMaterial, color_shade: e.target.value })}
                placeholder="Örn: Açık Kahverengi"
                required
              />
            )}

            {/* Cila için Firma */}
            {newMaterial.category === 'Cila' && (
              <TextField
                fullWidth
                label="Firma *"
                value={newMaterial.brand || ''}
                onChange={(e) => setNewMaterial({ ...newMaterial, brand: e.target.value })}
                placeholder="Örn: Sayerlack"
                required
              />
            )}

            {/* Binder için Kod ve Firma */}
            {newMaterial.category === 'Binder' && (
              <>
                <TextField
                  fullWidth
                  label="Kod *"
                  value={newMaterial.code || ''}
                  onChange={(e) => setNewMaterial({ ...newMaterial, code: e.target.value })}
                  placeholder="Örn: B-100"
                  required
                />
                <TextField
                  fullWidth
                  label="Firma *"
                  value={newMaterial.brand || ''}
                  onChange={(e) => setNewMaterial({ ...newMaterial, brand: e.target.value })}
                  placeholder="Örn: BASF"
                  required
                />
              </>
            )}

            {/* Kimyasal için Kod ve Firma */}
            {newMaterial.category === 'Kimyasal' && (
              <>
                <TextField
                  fullWidth
                  label="Kod"
                  value={newMaterial.code || ''}
                  onChange={(e) => setNewMaterial({ ...newMaterial, code: e.target.value })}
                  placeholder="Örn: K-200"
                />
                <TextField
                  fullWidth
                  label="Firma"
                  value={newMaterial.brand || ''}
                  onChange={(e) => setNewMaterial({ ...newMaterial, brand: e.target.value })}
                  placeholder="Örn: Clariant"
                />
              </>
            )}

            <TextField
              fullWidth
              label="Başlangıç Stok"
              type="text"
              value={newMaterial.stock_quantity}
              onChange={(e) => {
                const formatted = formatNumberWithCommas(e.target.value);
                setNewMaterial({ ...newMaterial, stock_quantity: formatted });
              }}
              helperText="Stoğa eklenecek malzeme miktarını kg cinsinden giriniz (Örn: 1,000)"
              placeholder="Örn: 1,000"
            />
            <TextField
              fullWidth
              label="Açıklama (Opsiyonel)"
              multiline
              rows={2}
              value={newMaterial.description}
              onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
              placeholder="Malzeme hakkında ek bilgiler..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddMaterialDialogOpen(false);
            setNewMaterial({
              category: '',
              color_shade: '',
              brand: '',
              code: '',
              stock_quantity: '',
              description: '',
            });
          }}>İptal</Button>
          <Button onClick={handleAddMaterial} variant="contained" disabled={loading}>
            {loading ? 'Ekleniyor...' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Product Movements Modal */}
      {selectedProduct && (
        <ProductMovementsModal
          open={modalOpen}
          onClose={handleCloseModal}
          product={selectedProduct}
          type={getItemType(selectedProduct)}
        />
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        sx={{ zIndex: 9999 }}
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

export default ProductManagement;