import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
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
import { dbAPI } from '../services/api';
import { Product, Category, Color } from '../../main/database/models';

interface NewProduct {
  category: string;
  color: string;
  stock_quantity: string;
  description: string;
}

const ProductManagement: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const [categories, setCategories] = useState<Category[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [newProduct, setNewProduct] = useState<NewProduct>({
    category: '',
    color: '',
    stock_quantity: '',
    description: '',
  });

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
  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await dbAPI.getProducts();
      if (response.success) {
        setProducts(response.data);
      } else {
        setSnackbar({ open: true, message: response.error || 'Ürünler yüklenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Ürünler yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadColors();
  }, []);

  const handleOpenModal = (product: Product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProduct(null);
  };

  const handleAddProduct = async () => {
    console.log('Form data:', newProduct);

    setLoading(true);
    try {
      const productData = {
        name: `${newProduct.category || 'Deri'} - ${newProduct.color || 'Renksiz'}`,
        category: newProduct.category,
        color: newProduct.color,
        stock_quantity: newProduct.stock_quantity ? parseInt(newProduct.stock_quantity) : 0,
        description: newProduct.description || undefined
      };

      console.log('Sending product data:', productData);
      const response = await dbAPI.createProduct(productData);
      console.log('API Response:', response);

      if (response.success) {
        setSnackbar({ open: true, message: 'Deri ürünü başarıyla eklendi', severity: 'success' });
        setAddDialogOpen(false);
        // Form temizle
        setNewProduct({
          category: '',
          color: '',
          stock_quantity: '',
          description: '',
        });
        await loadProducts();
      } else {
        console.error('API Error:', response.error);
        setSnackbar({ open: true, message: response.error || 'Deri ürünü eklenemedi', severity: 'error' });
      }
    } catch (error) {
      console.error('Exception:', error);
      setSnackbar({ open: true, message: 'Deri ürünü eklenirken hata oluştu: ' + error, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    try {
      const response = await dbAPI.updateProduct(selectedProduct.id!, selectedProduct);
      if (response.success) {
        setSnackbar({ open: true, message: 'Ürün başarıyla güncellendi', severity: 'success' });
        setEditDialogOpen(false);
        setSelectedProduct(null);
        await loadProducts();
      } else {
        setSnackbar({ open: true, message: response.error || 'Ürün güncellenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Ürün güncellenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    try {
      const response = await dbAPI.deleteProduct(selectedProduct.id!);
      if (response.success) {
        setSnackbar({ open: true, message: 'Ürün başarıyla silindi', severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedProduct(null);
        await loadProducts();
      } else {
        setSnackbar({ open: true, message: response.error || 'Ürün silinemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Ürün silinirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const productName = `${product.category || ''} - ${product.color || ''}`;
    const matchesSearch = searchTerm === '' ||
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.color || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === '' || product.category === filterCategory;
    const matchesColor = filterColor === '' || product.color === filterColor;

    return matchesSearch && matchesCategory && matchesColor;
  });

  const getStockStatus = (currentStock: number) => {
    if (currentStock === 0) return { label: 'Tükendi', color: 'error' };
    if (currentStock < 5) return { label: 'Kritik', color: 'error' };
    if (currentStock < 10) return { label: 'Düşük', color: 'warning' };
    return { label: 'Normal', color: 'success' };
  };

  const getColorDisplay = (colorName: string) => {
    // Renk verisi hem string hem de Color object array formatını destekle
    if (typeof colors[0] === 'string') {
      // Eğer colors string array ise, varsayılan renk döndür
      return '#F5F5DC';
    }
    
    // Color object array formatı
    const color = colors.find(c => c.name === colorName);
    return color?.hex_code || '#F5F5DC';
  };

  return (
    <Box>
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
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <InventoryIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {products.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Ürün
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                <TrendingUp />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0)} adet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Stok
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                <TrendingDown />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {products.filter(p => (p.stock_quantity || 0) < 5).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Düşük Stok
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                <FilterListIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {new Set(products.map(p => p.category)).size}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Deri Türü
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="large"
                placeholder="Ürün adı, kategori veya renk ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { minHeight: '56px' } }}
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
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="large" variant="outlined">
                <InputLabel id="category-filter-label">Deri Türü</InputLabel>
                <Select
                  labelId="category-filter-label"
                  value={filterCategory}
                  label="Deri Türü"
                  onChange={(e) => setFilterCategory(e.target.value)}
                  sx={{ minHeight: '56px' }}
                >
                  <MenuItem value="">Tüm Deri Türleri</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category.id} value={category.name}>{category.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth size="large" variant="outlined">
                <InputLabel id="color-filter-label">Renk</InputLabel>
                <Select
                  labelId="color-filter-label"
                  value={filterColor}
                  label="Renk"
                  onChange={(e) => setFilterColor(e.target.value)}
                  sx={{ minHeight: '56px' }}
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
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
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
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                sx={{ minHeight: '56px' }}
                onClick={() => setAddDialogOpen(true)}
              >
                Deri Ürünü Ekle
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Deri Stok Listesi ({filteredProducts.length} ürün)
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Deri Türü</TableCell>
                  <TableCell>Deri Rengi</TableCell>
                  <TableCell align="right">Stok (Adet)</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock_quantity || 0);
                  return (
                    <TableRow key={product.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{product.category}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              bgcolor: getColorDisplay(product.color || ''),
                              border: '1px solid rgba(0,0,0,0.2)',
                            }}
                          />
                          {product.color || 'Belirtilmemiş'}
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {product.stock_quantity || 0} adet
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
                          onClick={() => {
                            setSelectedProduct(product);
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
                            setSelectedProduct(product);
                            setDeleteDialogOpen(true);
                          }}
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
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Deri Ürünü Ekle</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Deri Türü</InputLabel>
                <Select
                  value={newProduct.category}
                  label="Deri Türü"
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                >
                  {categories.map(category => (
                    <MenuItem key={category.id} value={category.name}>{category.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Deri Rengi</InputLabel>
                <Select
                  value={newProduct.color}
                  label="Deri Rengi"
                  onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
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
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Başlangıç Stok (Adet)"
                type="number"
                value={newProduct.stock_quantity}
                onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })}
                helperText="Stoğa eklenecek deri miktarını adet cinsinden giriniz"
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Açıklama (Opsiyonel)"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                helperText="Ürün hakkında ek bilgiler"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddDialogOpen(false);
            setNewProduct({
              category: '',
              color: '',
              stock_quantity: '',
              description: '',
            });
          }}>İptal</Button>
          <Button onClick={handleAddProduct} variant="contained" disabled={loading}>
            {loading ? 'Ekleniyor...' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Deri Ürünü Düzenle</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Deri Türü</InputLabel>
                <Select
                  value={selectedProduct?.category || ''}
                  label="Deri Türü"
                  onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, category: e.target.value as any } : null)}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat.id} value={cat.name}>{cat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
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
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Stok Miktarı (Adet)"
                type="number"
                value={selectedProduct?.stock_quantity || ''}
                onChange={(e) => setSelectedProduct(prev => prev ? { ...prev, stock_quantity: parseInt(e.target.value) || 0 } : null)}
                helperText="Stok miktarını adet cinsinden giriniz"
                slotProps={{ htmlInput: { min: 0, step: 1 } }}
              />
            </Grid>
          </Grid>
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
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Deri Ürünü Sil</DialogTitle>
        <DialogContent>
          <Typography>
            "{selectedProduct?.category} - {selectedProduct?.color}" deri ürünü silmek istediğinizden emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Bu işlem geri alınamaz ve tüm stok hareketleri silinecektir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>İptal</Button>
          <Button
            onClick={handleDeleteProduct}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Product Movements Modal */}
      {selectedProduct && (
        <ProductMovementsModal
          open={modalOpen}
          onClose={handleCloseModal}
          product={selectedProduct}
        />
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
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

export default ProductManagement;