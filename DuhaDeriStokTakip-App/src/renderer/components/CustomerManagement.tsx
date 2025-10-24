import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  InputAdornment,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Person,
  Add,
  Edit,
  Delete,
  Search,
  AccountBalance,
  Visibility,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { dbAPI } from '../services/api';
import { Customer } from '../../main/database/models';

interface NewCustomer {
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface CustomerWithBalance extends Customer {
  balanceTRY?: number;
  balanceUSD?: number;
  balanceEUR?: number;
}

const CustomerManagement: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerWithBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSupplierDialogOpen, setAddSupplierDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const [newCustomer, setNewCustomer] = useState<NewCustomer>({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const [newSupplier, setNewSupplier] = useState<NewCustomer>({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  // Müşteri bakiyesini hesapla
  const calculateCustomerBalance = async (customerId: number) => {
    try {
      // Müşteri ödemelerini al
      const paymentsResponse = await dbAPI.getCustomerPayments(customerId);
      const payments = paymentsResponse.success ? paymentsResponse.data || [] : [];

      // Müşteri satışlarını al
      const salesResponse = await dbAPI.getSales();
      const allSales = salesResponse.success ? salesResponse.data || [] : [];
      const customerSales = allSales.filter((sale: any) => sale.customer_id === customerId);

      // Tedarikçi alımlarını al (sadece tedarikçiler için)
      const purchasesResponse = await dbAPI.getPurchases();
      const allPurchases = purchasesResponse.success ? purchasesResponse.data || [] : [];
      const supplierPurchases = allPurchases.filter((purchase: any) => purchase.supplier_id === customerId);

      // Para birimi bazında hesaplama
      const totalSalesTRY = customerSales.filter((sale: any) => (sale.currency || 'TRY') === 'TRY').reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
      const totalSalesUSD = customerSales.filter((sale: any) => (sale.currency || 'TRY') === 'USD').reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);
      const totalSalesEUR = customerSales.filter((sale: any) => (sale.currency || 'TRY') === 'EUR').reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);

      const totalPurchasesTRY = supplierPurchases.filter((purchase: any) => (purchase.currency || 'TRY') === 'TRY').reduce((sum: number, purchase: any) => sum + (purchase.total_amount || 0), 0);
      const totalPurchasesUSD = supplierPurchases.filter((purchase: any) => (purchase.currency || 'TRY') === 'USD').reduce((sum: number, purchase: any) => sum + (purchase.total_amount || 0), 0);
      const totalPurchasesEUR = supplierPurchases.filter((purchase: any) => (purchase.currency || 'TRY') === 'EUR').reduce((sum: number, purchase: any) => sum + (purchase.total_amount || 0), 0);

      const totalPaymentsTRY = payments.filter((payment: any) => (payment.currency || 'TRY') === 'TRY').reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
      const totalPaymentsUSD = payments.filter((payment: any) => (payment.currency || 'TRY') === 'USD').reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
      const totalPaymentsEUR = payments.filter((payment: any) => (payment.currency || 'TRY') === 'EUR').reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);

      // Müşteri için: Bakiye = Ödemeler - Satışlar (negatif değer borç demek)
      // Tedarikçi için: Bakiye = Alımlar - Ödemeler (pozitif değer borç demek)
      const balanceTRY = totalPurchasesTRY - totalPaymentsTRY;
      const balanceUSD = totalPurchasesUSD - totalPaymentsUSD;
      const balanceEUR = totalPurchasesEUR - totalPaymentsEUR;

      return { balanceTRY, balanceUSD, balanceEUR };
    } catch (error) {
      console.error('Error calculating customer balance:', error);
      return { balanceTRY: 0, balanceUSD: 0, balanceEUR: 0 };
    }
  };

  // Müşterileri yükle
  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await dbAPI.getCustomers();
      if (response.success) {
        // Her müşteri için bakiye hesapla
        const customersWithBalance = await Promise.all(
          response.data.map(async (customer: Customer) => {
            const balance = await calculateCustomerBalance(customer.id!);
            console.log(`Müşteri ${customer.name} (${customer.type}) bakiye:`, balance);
            return {
              ...customer,
              balanceTRY: balance.balanceTRY,
              balanceUSD: balance.balanceUSD,
              balanceEUR: balance.balanceEUR,
            };
          })
        );
        // Type alanını veritabanından gelen değere göre ayarla
        const processedCustomers = customersWithBalance.map(customer => {
          // Veritabanından gelen type değerini kullan, yoksa customer yap
          return { 
            ...customer, 
            type: (customer.type || 'customer') as 'customer' | 'supplier'
          };
        });
        
        setCustomers(processedCustomers);
      } else {
        setSnackbar({ open: true, message: response.error || 'Müşteriler yüklenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Müşteriler yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleAddCustomer = async () => {
    setLoading(true);
    try {
      const customerData = {
        name: newCustomer.name || 'Müşteri',
        phone: newCustomer.phone || undefined,
        email: newCustomer.email || undefined,
        address: newCustomer.address || undefined,
        balance: 0,
        type: 'customer' as const, // Müşteri olarak işaretle
      };

      const response = await dbAPI.createCustomer(customerData);
      console.log('Müşteri ekleme yanıtı:', response);
      if (response.success) {
        setSnackbar({ open: true, message: 'Müşteri başarıyla eklendi', severity: 'success' });
        setAddDialogOpen(false);
        setNewCustomer({
          name: '',
          phone: '',
          email: '',
          address: '',
        });
        // Kısa bir bekleme sonrası yeniden yükle
        setTimeout(async () => {
          await loadCustomers();
        }, 500);
      } else {
        setSnackbar({ open: true, message: response.error || 'Müşteri eklenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Müşteri eklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async () => {
    setLoading(true);
    try {
      const supplierData = {
        name: newSupplier.name || 'Tedarikçi',
        phone: newSupplier.phone || undefined,
        email: newSupplier.email || undefined,
        address: newSupplier.address || undefined,
        balance: 0,
        type: 'supplier' as const, // Tedarikçi olarak işaretle
      };

      const response = await dbAPI.createCustomer(supplierData);
      console.log('Tedarikçi ekleme yanıtı:', response);
      if (response.success) {
        setSnackbar({ open: true, message: 'Tedarikçi başarıyla eklendi', severity: 'success' });
        setAddSupplierDialogOpen(false);
        setNewSupplier({
          name: '',
          phone: '',
          email: '',
          address: '',
        });
        // Kısa bir bekleme sonrası yeniden yükle
        setTimeout(async () => {
          await loadCustomers();
        }, 500);
      } else {
        setSnackbar({ open: true, message: response.error || 'Tedarikçi eklenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Tedarikçi eklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCustomer = async () => {
    if (!selectedCustomer) return;

    setLoading(true);
    try {
      const response = await dbAPI.updateCustomer(selectedCustomer.id!, selectedCustomer);
      if (response.success) {
        setSnackbar({ open: true, message: 'Müşteri başarıyla güncellendi', severity: 'success' });
        setEditDialogOpen(false);
        setSelectedCustomer(null);
        await loadCustomers();
      } else {
        setSnackbar({ open: true, message: response.error || 'Müşteri güncellenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Müşteri güncellenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) {
      console.log('selectedCustomer null, işlem iptal edildi');
      setDeleteDialogOpen(false);
      return;
    }
    setLoading(true);
    try {
      const response = await dbAPI.deleteCustomer(selectedCustomer.id!);
      console.log('Silme yanıtı:', response);
      if (response.success) {
        setSnackbar({ open: true, message: 'Müşteri başarıyla silindi', severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedCustomer(null);
        await loadCustomers();
      } else {
        setSnackbar({ open: true, message: response.error || 'Müşteri silinemedi', severity: 'error' });
        setDeleteDialogOpen(false); // Başarısız da olsa dialogu kapat
        setSelectedCustomer(null);  // Seçimi sıfırla
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Müşteri silinirken hata oluştu', severity: 'error' });
      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  // Debug: Müşteri tiplerini kontrol et
  console.log('Tüm müşteriler ve tipleri:', customers.map(c => ({ name: c.name, type: c.type })));

  const filteredCustomers = customers.filter(customer =>
    (!customer.type || customer.type !== 'supplier') && // Tedarikçileri hariç tut (type yoksa müşteri kabul et)
    (customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSuppliers = customers.filter(customer =>
    (customer.type === 'supplier') && // Sadece tedarikçileri al
    (customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );



  const getBalanceColor = (balanceTRY: number, balanceUSD: number, balanceEUR: number) => {
    const totalBalance = balanceTRY + balanceUSD + balanceEUR;
    if (totalBalance > 0) return 'success';
    if (totalBalance < 0) return 'error';
    return 'default';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Partner Yönetimi
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Müşterilerinizi yönetin ve takip edin
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <Person />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {customers.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Müşteri
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                <TrendingUp />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {customers.filter(c => ((c.balanceTRY || 0) + (c.balanceUSD || 0) + (c.balanceEUR || 0)) > 0).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Alacaklı Müşteri
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                <TrendingDown />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {customers.filter(c => ((c.balanceTRY || 0) + (c.balanceUSD || 0) + (c.balanceEUR || 0)) < 0).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Borçlu Müşteri
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                <AccountBalance />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  ₺{customers.reduce((sum, c) => sum + (c.balanceTRY || 0), 0).toLocaleString()}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  ${customers.reduce((sum, c) => sum + (c.balanceUSD || 0), 0).toLocaleString()}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  €{customers.reduce((sum, c) => sum + (c.balanceEUR || 0), 0).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Net Bakiye (TL / USD / EUR)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Add */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="large"
                placeholder="Müşteri adı, telefon veya email ara..."
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
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddDialogOpen(true)}
                size="large"
              >
                Yeni Müşteri Ekle
              </Button>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setAddSupplierDialogOpen(true)}
                size="large"
              >
                Yeni Tedarikçi Ekle
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Müşteri Listesi ({filteredCustomers.length} müşteri)
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Müşteri Adı</TableCell>
                  <TableCell>Telefon</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Bakiye</TableCell>
                  <TableCell align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{customer.name}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`₺${(customer.balanceTRY || 0).toLocaleString('tr-TR')} / $${(customer.balanceUSD || 0).toLocaleString('tr-TR')} / €${(customer.balanceEUR || 0).toLocaleString('tr-TR')}`}
                        color={getBalanceColor(customer.balanceTRY || 0, customer.balanceUSD || 0, customer.balanceEUR || 0) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="info"
                        title="Detay"
                        onClick={() => navigate(`/customers/${customer.id}`)}
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="primary"
                        title="Düzenle"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        title="Sil"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      {loading ? 'Yükleniyor...' : 'Müşteri bulunamadı'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card sx={{ mt: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Tedarikçi Listesi ({filteredSuppliers.length} tedarikçi)
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tedarikçi Adı</TableCell>
                  <TableCell>Telefon</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Bakiye</TableCell>
                  <TableCell align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{supplier.name}</TableCell>
                    <TableCell>{supplier.phone || '-'}</TableCell>
                    <TableCell>{supplier.email || '-'}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`₺${(supplier.balanceTRY || 0).toLocaleString('tr-TR')} / $${(supplier.balanceUSD || 0).toLocaleString('tr-TR')} / €${(supplier.balanceEUR || 0).toLocaleString('tr-TR')}`}
                        color={getBalanceColor(supplier.balanceTRY || 0, supplier.balanceUSD || 0, supplier.balanceEUR || 0) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="info"
                        title="Detay"
                        onClick={() => navigate(`/suppliers/${supplier.id}`)}
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="primary"
                        title="Düzenle"
                        onClick={() => {
                          setSelectedCustomer(supplier);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        title="Sil"
                        onClick={() => {
                          setSelectedCustomer(supplier);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSuppliers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      {loading ? 'Yükleniyor...' : 'Tedarikçi bulunamadı'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add Customer Dialog */}
      <Dialog 
        open={addDialogOpen} 
        onClose={() => setAddDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>Yeni Müşteri Ekle</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Müşteri Adı"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefon"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adres"
                multiline
                rows={2}
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>İptal</Button>
          <Button onClick={handleAddCustomer} variant="contained" disabled={loading}>
            {loading ? 'Ekleniyor...' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Supplier Dialog */}
      <Dialog 
        open={addSupplierDialogOpen} 
        onClose={() => setAddSupplierDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>Yeni Tedarikçi Ekle</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tedarikçi Adı"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefon"
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newSupplier.email}
                onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adres"
                multiline
                rows={2}
                value={newSupplier.address}
                onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddSupplierDialogOpen(false)}>İptal</Button>
          <Button onClick={handleAddSupplier} variant="contained" disabled={loading}>
            {loading ? 'Ekleniyor...' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>Müşteri Düzenle</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Müşteri Adı"
                value={selectedCustomer?.name || ''}
                onChange={(e) => setSelectedCustomer(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefon"
                value={selectedCustomer?.phone || ''}
                onChange={(e) => setSelectedCustomer(prev => prev ? { ...prev, phone: e.target.value } : null)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={selectedCustomer?.email || ''}
                onChange={(e) => setSelectedCustomer(prev => prev ? { ...prev, email: e.target.value } : null)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Adres"
                multiline
                rows={2}
                value={selectedCustomer?.address || ''}
                onChange={(e) => setSelectedCustomer(prev => prev ? { ...prev, address: e.target.value } : null)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>İptal</Button>
          <Button onClick={handleEditCustomer} variant="contained" disabled={loading}>
            {loading ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedCustomer(null);
        }}
        disableEnforceFocus
      >
        <DialogTitle>Müşteri Sil</DialogTitle>
        <DialogContent>
          <Typography>
            "{selectedCustomer?.name}" müşterisini silmek istediğinizden emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setSelectedCustomer(null);
          }}>İptal</Button>
          <Button onClick={() => {
            console.log('Delete butonu tıklandı, işlem başlıyor');
            handleDeleteCustomer();
          }} variant="contained" color="error" disabled={loading}>
            {loading ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>

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

export default CustomerManagement;