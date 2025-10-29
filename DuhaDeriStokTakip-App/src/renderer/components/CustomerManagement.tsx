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
import Pagination from './common/Pagination';
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Pagination states for Customers
  const [customersCurrentPage, setCustomersCurrentPage] = useState(1);
  const [customersItemsPerPage, setCustomersItemsPerPage] = useState(10);

  const [newCustomer, setNewCustomer] = useState<NewCustomer>({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  // Müşterileri yükle
  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await dbAPI.getCustomers();
      if (response.success) {
        // Veritabanından gelen bakiyeleri kullan (manuel hesaplama yok!)
        const customersWithBalance = response.data.map((customer: any) => {
          // Veritabanından gelen bakiyeleri parse et
          const balanceTRY = parseFloat(customer.balance) || 0;
          const balanceUSD = parseFloat(customer.balance_usd) || 0;
          const balanceEUR = parseFloat(customer.balance_eur) || 0;

          console.log(`Müşteri ${customer.name} (${customer.type}) bakiye:`, {
            balanceTRY,
            balanceUSD,
            balanceEUR,
            dbValues: {
              balance: customer.balance,
              balance_usd: customer.balance_usd,
              balance_eur: customer.balance_eur
            }
          });

          return {
            ...customer,
            balanceTRY,
            balanceUSD,
            balanceEUR,
          };
        });

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

  // Pagination handlers for Customers
  const handleCustomersPageChange = (page: number) => {
    setCustomersCurrentPage(page);
  };

  const handleCustomersItemsPerPageChange = (newItemsPerPage: number) => {
    setCustomersItemsPerPage(newItemsPerPage);
    setCustomersCurrentPage(1);
  };

  // Search değiştiğinde sayfa 1'e dön
  useEffect(() => {
    setCustomersCurrentPage(1);
  }, [searchTerm]);

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

  // Müşterileri filtrele ve paginate et
  const allFilteredCustomers = customers.filter(customer =>
    (!customer.type || customer.type !== 'supplier') && // Tedarikçileri hariç tut (type yoksa müşteri kabul et)
    (customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const customersStartIndex = (customersCurrentPage - 1) * customersItemsPerPage;
  const customersEndIndex = customersStartIndex + customersItemsPerPage;
  const filteredCustomers = allFilteredCustomers.slice(customersStartIndex, customersEndIndex);

  // Müşteriler için: Alacak (artı) = yeşil, Borç (eksi) = kırmızı
  const getCustomerBalanceColor = (balanceTRY: number, balanceUSD: number, balanceEUR: number) => {
    const totalBalance = balanceTRY + balanceUSD + balanceEUR;
    if (totalBalance > 0) return 'success'; // Alacak (yeşil)
    if (totalBalance < 0) return 'error'; // Borç (kırmızı)
    return 'default';
  };

  return (
    <Box sx={{ mr: 4, mt: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Müşteri Yönetimi
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Müşterilerinizi yönetin ve takip edin
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 2, mb: 4 }}>
        <Card variant="outlined">
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                <Person sx={{ fontSize: 20 }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.3 }}>
                  Toplam Müşteri
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {customers.length}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'success.main', width: 40, height: 40 }}>
                <TrendingUp sx={{ fontSize: 20 }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.3 }}>
                  Alacaklı Müşteri
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {customers.filter(c => ((c.balanceTRY || 0) + (c.balanceUSD || 0) + (c.balanceEUR || 0)) < 0).length}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'error.main', width: 40, height: 40 }}>
                <TrendingDown sx={{ fontSize: 20 }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.3 }}>
                  Borçlu Müşteri
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {customers.filter(c => ((c.balanceTRY || 0) + (c.balanceUSD || 0) + (c.balanceEUR || 0)) > 0).length}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main', width: 40, height: 40 }}>
                <AccountBalance sx={{ fontSize: 20 }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                  Net Bakiye
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    ₺{customers.reduce((sum, c) => sum + (Number(c.balanceTRY) || 0), 0).toLocaleString()}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    ${customers.reduce((sum, c) => sum + (Number(c.balanceUSD) || 0), 0).toLocaleString()}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    €{customers.reduce((sum, c) => sum + (Number(c.balanceEUR) || 0), 0).toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Search and Add */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center" justifyContent='space-between'>
            <Grid size={{ xs: 12, md: 6, }}>
              <TextField
                fullWidth
                size="medium"
                placeholder="Müşteri adı, telefon veya email ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3, }}>
              <Button
                fullWidth
                variant="contained"
                size='large'
                startIcon={<Add />}
                onClick={() => setAddDialogOpen(true)}
                sx={{ px: 0 }}
              >
                Müşteri Ekle
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
              Müşteri Listesi ({allFilteredCustomers.length} müşteri)
            </Typography>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Müşteri Adı</TableCell>
                  <TableCell>Telefon</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Bakiye (₺)</TableCell>
                  <TableCell align="right">Bakiye ($)</TableCell>
                  <TableCell align="right">Bakiye (€)</TableCell>
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
                        label={`₺${(customer.balanceTRY || 0).toLocaleString('tr-TR')}`}
                        color={(customer.balanceTRY || 0) > 0 ? 'success' : (customer.balanceTRY || 0) < 0 ? 'error' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600, minWidth: 100 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`$${(customer.balanceUSD || 0).toLocaleString('tr-TR')}`}
                        color={(customer.balanceUSD || 0) > 0 ? 'success' : (customer.balanceUSD || 0) < 0 ? 'error' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600, minWidth: 100 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`€${(customer.balanceEUR || 0).toLocaleString('tr-TR')}`}
                        color={(customer.balanceEUR || 0) > 0 ? 'success' : (customer.balanceEUR || 0) < 0 ? 'error' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600, minWidth: 100 }}
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
                    <TableCell colSpan={7} align="center">
                      {loading ? 'Yükleniyor...' : 'Müşteri bulunamadı'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination for Customers */}
          <Pagination
            currentPage={customersCurrentPage}
            totalPages={Math.ceil(allFilteredCustomers.length / customersItemsPerPage)}
            totalItems={allFilteredCustomers.length}
            itemsPerPage={customersItemsPerPage}
            onPageChange={handleCustomersPageChange}
            onItemsPerPageChange={handleCustomersItemsPerPageChange}
          />
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
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Müşteri Adı"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Telefon"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
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
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Müşteri Adı"
                value={selectedCustomer?.name || ''}
                onChange={(e) => setSelectedCustomer(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Telefon"
                value={selectedCustomer?.phone || ''}
                onChange={(e) => setSelectedCustomer(prev => prev ? { ...prev, phone: e.target.value } : null)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={selectedCustomer?.email || ''}
                onChange={(e) => setSelectedCustomer(prev => prev ? { ...prev, email: e.target.value } : null)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
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
          <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 600 }}>
            ⚠️ Uyarı: Bu işlem geri alınamaz!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Müşteri silindiğinde aşağıdakiler de silinecek:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              Tüm satış kayıtları
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Tüm ödeme kayıtları
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Tüm kasa işlemleri
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Tüm stok hareketleri
            </Typography>
          </Box>
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

export default CustomerManagement;