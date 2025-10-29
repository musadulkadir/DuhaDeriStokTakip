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
    Business,
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

interface NewSupplier {
    name: string;
    phone: string;
    email: string;
    address: string;
}

interface SupplierWithBalance extends Customer {
    balanceTRY?: number;
    balanceUSD?: number;
    balanceEUR?: number;
}

const SupplierManagement: React.FC = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<SupplierWithBalance[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Customer | null>(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [newSupplier, setNewSupplier] = useState<NewSupplier>({
        name: '',
        phone: '',
        email: '',
        address: '',
    });

    // Tedarikçileri yükle
    const loadSuppliers = async () => {
        setLoading(true);
        try {
            const response = await dbAPI.getCustomers();
            if (response.success) {
                // Sadece tedarikçileri filtrele
                const supplierList = response.data
                    .filter((customer: any) => customer.type === 'supplier')
                    .map((supplier: any) => {
                        const balanceTRY = parseFloat(supplier.balance) || 0;
                        const balanceUSD = parseFloat(supplier.balance_usd) || 0;
                        const balanceEUR = parseFloat(supplier.balance_eur) || 0;

                        return {
                            ...supplier,
                            balanceTRY,
                            balanceUSD,
                            balanceEUR,
                        };
                    });

                setSuppliers(supplierList);
            } else {
                setSnackbar({ open: true, message: response.error || 'Tedarikçiler yüklenemedi', severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Tedarikçiler yüklenirken hata oluştu', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSuppliers();
    }, []);

    // Pagination handlers
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (newItemsPerPage: number) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1);
    };

    // Search değiştiğinde sayfa 1'e dön
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleAddSupplier = async () => {
        setLoading(true);
        try {
            const supplierData = {
                name: newSupplier.name || 'Tedarikçi',
                phone: newSupplier.phone || undefined,
                email: newSupplier.email || undefined,
                address: newSupplier.address || undefined,
                balance: 0,
                type: 'supplier' as const,
            };

            const response = await dbAPI.createCustomer(supplierData);
            if (response.success) {
                setSnackbar({ open: true, message: 'Tedarikçi başarıyla eklendi', severity: 'success' });
                setAddDialogOpen(false);
                setNewSupplier({
                    name: '',
                    phone: '',
                    email: '',
                    address: '',
                });
                setTimeout(async () => {
                    await loadSuppliers();
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

    const handleEditSupplier = async () => {
        if (!selectedSupplier) return;

        setLoading(true);
        try {
            const response = await dbAPI.updateCustomer(selectedSupplier.id!, selectedSupplier);
            if (response.success) {
                setSnackbar({ open: true, message: 'Tedarikçi başarıyla güncellendi', severity: 'success' });
                setEditDialogOpen(false);
                setSelectedSupplier(null);
                await loadSuppliers();
            } else {
                setSnackbar({ open: true, message: response.error || 'Tedarikçi güncellenemedi', severity: 'error' });
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Tedarikçi güncellenirken hata oluştu', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSupplier = async () => {
        if (!selectedSupplier) {
            setDeleteDialogOpen(false);
            return;
        }
        setLoading(true);
        try {
            const response = await dbAPI.deleteCustomer(selectedSupplier.id!);
            if (response.success) {
                setSnackbar({ open: true, message: 'Tedarikçi başarıyla silindi', severity: 'success' });
                setDeleteDialogOpen(false);
                setSelectedSupplier(null);
                await loadSuppliers();
            } else {
                setSnackbar({ open: true, message: response.error || 'Tedarikçi silinemedi', severity: 'error' });
                setDeleteDialogOpen(false);
                setSelectedSupplier(null);
            }
        } catch (error) {
            setSnackbar({ open: true, message: 'Tedarikçi silinirken hata oluştu', severity: 'error' });
            setDeleteDialogOpen(false);
            setSelectedSupplier(null);
        } finally {
            setLoading(false);
        }
    };

    // Tedarikçileri filtrele ve paginate et
    const allFilteredSuppliers = suppliers.filter(supplier =>
        supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const filteredSuppliers = allFilteredSuppliers.slice(startIndex, endIndex);

    // Tedarikçiler için: Borç (artı) = kırmızı, Alacak (eksi) = yeşil
    const getBalanceColor = (balanceTRY: number, balanceUSD: number, balanceEUR: number) => {
        const totalBalance = balanceTRY + balanceUSD + balanceEUR;
        if (totalBalance > 0) return 'error'; // Borç (kırmızı)
        if (totalBalance < 0) return 'success'; // Alacak (yeşil)
        return 'default';
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                    Tedarikçi Yönetimi
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Tedarikçilerinizi yönetin ve takip edin
                </Typography>
            </Box>

            {/* Quick Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                <Business />
                            </Avatar>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    {suppliers.length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Toplam Tedarikçi
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                            <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                                <TrendingUp />
                            </Avatar>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    {suppliers.filter(s => ((s.balanceTRY || 0) + (s.balanceUSD || 0) + (s.balanceEUR || 0)) > 0).length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Alacaklı Tedarikçi
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                            <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                                <TrendingDown />
                            </Avatar>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    {suppliers.filter(s => ((s.balanceTRY || 0) + (s.balanceUSD || 0) + (s.balanceEUR || 0)) < 0).length}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Borçlu Tedarikçi
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
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                size="large"
                                placeholder="Tedarikçi adı, telefon veya email ara..."
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
                        <Grid item xs={12} md={4}>
                            <Button
                                fullWidth
                                variant="contained"
                                startIcon={<Add />}
                                onClick={() => setAddDialogOpen(true)}
                                size="large"
                            >
                                Yeni Tedarikçi Ekle
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Suppliers Table */}
            <Card>
                <CardContent sx={{ p: 0 }}>
                    <Box sx={{ p: 3, pb: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Tedarikçi Listesi ({allFilteredSuppliers.length} tedarikçi)
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
                                                    setSelectedSupplier(supplier);
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
                                                    setSelectedSupplier(supplier);
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

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(allFilteredSuppliers.length / itemsPerPage)}
                        totalItems={allFilteredSuppliers.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                    />
                </CardContent>
            </Card>

            {/* Add Supplier Dialog */}
            <Dialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
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
                    <Button onClick={() => setAddDialogOpen(false)}>İptal</Button>
                    <Button onClick={handleAddSupplier} variant="contained" disabled={loading}>
                        {loading ? 'Ekleniyor...' : 'Ekle'}
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
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Tedarikçi Adı"
                                value={selectedSupplier?.name || ''}
                                onChange={(e) => setSelectedSupplier(prev => prev ? { ...prev, name: e.target.value } : null)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Telefon"
                                value={selectedSupplier?.phone || ''}
                                onChange={(e) => setSelectedSupplier(prev => prev ? { ...prev, phone: e.target.value } : null)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={selectedSupplier?.email || ''}
                                onChange={(e) => setSelectedSupplier(prev => prev ? { ...prev, email: e.target.value } : null)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Adres"
                                multiline
                                rows={2}
                                value={selectedSupplier?.address || ''}
                                onChange={(e) => setSelectedSupplier(prev => prev ? { ...prev, address: e.target.value } : null)}
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

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setSelectedSupplier(null);
                }}
                disableEnforceFocus
            >
                <DialogTitle>Tedarikçi Sil</DialogTitle>
                <DialogContent>
                    <Typography>
                        "{selectedSupplier?.name}" tedarikçisini silmek istediğinizden emin misiniz?
                    </Typography>
                    <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 600 }}>
                        ⚠️ Uyarı: Bu işlem geri alınamaz!
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Tedarikçi silindiğinde aşağıdakiler de silinecek:
                    </Typography>
                    <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                        <Typography component="li" variant="body2" color="text.secondary">
                            Tüm alım kayıtları
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary">
                            Tüm ödeme kayıtları
                        </Typography>
                        <Typography component="li" variant="body2" color="text.secondary">
                            Tüm kasa işlemleri
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setDeleteDialogOpen(false);
                        setSelectedSupplier(null);
                    }}>İptal</Button>
                    <Button onClick={handleDeleteSupplier} variant="contained" color="error" disabled={loading}>
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
        </Box>
    );
};

export default SupplierManagement;
