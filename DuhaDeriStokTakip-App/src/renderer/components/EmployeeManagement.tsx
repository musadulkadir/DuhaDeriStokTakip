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
  Fab,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Person,
  Add,
  Edit,
  Delete,
  Search,
  Phone,
  Work,
  Business,
  AccountBalance,
  Visibility,
  TrendingUp,
  TrendingDown,
  People,
  PersonOff,
  PersonAdd,
} from '@mui/icons-material';
import Pagination from './common/Pagination';
import { dbAPI } from '../services/api';
import CurrencyInput from './CurrencyInput';
import { Employee } from '@/main/database/models';

interface NewEmployee {
  name: string;
  email: string;
  phone: string;
  position: string;
  salary: string;
  salaryCurrency: 'TRY' | 'USD' | 'EUR';
}

const EmployeeManagement: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Employee status states
  const [showInactiveEmployees, setShowInactiveEmployees] = useState(false);
  const [activeEmployeesCount, setActiveEmployeesCount] = useState<number>(0);
  const [inactiveEmployeesCount, setInactiveEmployeesCount] = useState<number>(0);
  const [totalSalary, setTotalSalary] = useState<number>(0);

  const [newEmployee, setNewEmployee] = useState<NewEmployee>({
    name: '',
    email: '',
    phone: '',
    position: '',
    salary: '',
    salaryCurrency: 'TRY',
  });

  const loadEmployeesCount = async () => {
    setLoading(true);
    try {
      const response = await dbAPI.getEmployeesCount();
      if (response.success) {
        setTotalItems(response.data?.countEmployees || 0);
        setActiveEmployeesCount(response.data?.countActiveEmployees || 0);
        setInactiveEmployeesCount(response.data?.countInactiveEmployees || 0);
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Çalışan sayıları yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }

  // Çalışanları yükle
  const loadEmployees = async (page = currentPage, limit = itemsPerPage, search = searchTerm) => {
    setLoading(true);
    try {
      const status = showInactiveEmployees ? 'inactive' : 'active';
      const response = await dbAPI.getEmployeesByStatus(status, page, limit, search);
      if (response.success) {
        setEmployees(response.data);
        setTotalItems(response.total || 0);
        setTotalSalary(response.totalSalary || 0);
      } else {
        setSnackbar({ open: true, message: response.error || 'Çalışanlar yüklenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Çalışanlar yüklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployeesCount();
    loadEmployees();
  }, [currentPage, itemsPerPage, showInactiveEmployees, searchTerm]);

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
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm]);

  // Çalışan ekle
  const handleAddEmployee = async () => {
    console.log('handleAddEmployee called');
    console.log('newEmployee:', newEmployee);

    if (!newEmployee.name.trim()) {
      setSnackbar({ open: true, message: 'Ad alanı zorunludur', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const employeeData = {
        name: newEmployee.name.trim(),
        email: newEmployee.email.trim() || undefined,
        phone: newEmployee.phone.trim() || undefined,
        position: newEmployee.position.trim() || undefined,
        salary: parseFloat(newEmployee.salary) || undefined,
        salary_currency: newEmployee.salaryCurrency,
        balance: 0,
        status: 'active' as const,
      };

      console.log('employeeData to send:', employeeData);
      const response = await dbAPI.createEmployee(employeeData);
      console.log('createEmployee response:', response);

      if (response.success) {
        await loadEmployees();
        await loadEmployeesCount();
        setSnackbar({ open: true, message: 'Çalışan başarıyla eklendi', severity: 'success' });
        setAddDialogOpen(false);
        setNewEmployee({ name: '', email: '', phone: '', position: '', salary: '', salaryCurrency: 'TRY' });
      } else {
        console.error('Employee creation failed:', response.error);
        setSnackbar({ open: true, message: response.error || 'Çalışan eklenemedi', severity: 'error' });
      }
    } catch (error) {
      console.error('Employee creation error:', error);
      setSnackbar({ open: true, message: 'Çalışan eklenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Çalışan güncelle
  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    setLoading(true);
    try {
      const response = await dbAPI.updateEmployee(selectedEmployee.id!, selectedEmployee);
      if (response.success) {
        await loadEmployees();
        await loadEmployeesCount();
        setSnackbar({ open: true, message: 'Çalışan başarıyla güncellendi', severity: 'success' });
        setEditDialogOpen(false);
        setSelectedEmployee(null);
      } else {
        setSnackbar({ open: true, message: response.error || 'Çalışan güncellenemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Çalışan güncellenirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Çalışan sil
  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) {
      console.log('selectedEmployee null, işlem iptal edildi');
      setDeleteDialogOpen(false);
      return;
    }
    setLoading(true);
    try {
      const response = await dbAPI.deleteEmployee(selectedEmployee.id!);
      console.log('Silme yanıtı:', response);
      if (response.success) {
        await loadEmployees();
        await loadEmployeesCount();
        setSnackbar({ open: true, message: 'Çalışan başarıyla silindi', severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedEmployee(null);
      } else {
        setSnackbar({ open: true, message: response.error || 'Çalışan silinemedi', severity: 'error' });
        setDeleteDialogOpen(false); // Başarısız da olsa dialogu kapat
        setSelectedEmployee(null);  // Seçimi sıfırla
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Çalışan silinirken hata oluştu', severity: 'error' });
      setDeleteDialogOpen(false);
      setSelectedEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  // Çalışanı pasif et
  const handleDeactivateEmployee = async () => {
    if (!selectedEmployee) {
      console.log('selectedEmployee null, işlem iptal edildi');
      setDeleteDialogOpen(false);
      return;
    }
    setLoading(true);
    try {
      const response = await dbAPI.updateEmployeeStatus(selectedEmployee.id!, 'inactive');
      if (response.success) {
        await loadEmployees();
        await loadEmployeesCount();
        setSnackbar({ open: true, message: `${selectedEmployee.name} başarıyla pasif edildi`, severity: 'success' });
        setDeleteDialogOpen(false);
        setSelectedEmployee(null);
      } else {
        setSnackbar({ open: true, message: response.error || 'Çalışan pasif edilemedi', severity: 'error' });
        setDeleteDialogOpen(false);
        setSelectedEmployee(null);
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Çalışan pasif edilirken hata oluştu', severity: 'error' });
      setDeleteDialogOpen(false);
      setSelectedEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  // Çalışanı aktif et
  const handleActivateEmployee = async (employee: Employee) => {
    setLoading(true);
    try {
      const response = await dbAPI.updateEmployeeStatus(employee.id!, 'active');
      if (response.success) {
        await loadEmployees();
        await loadEmployeesCount();
        setSnackbar({ open: true, message: `${employee.name} başarıyla aktif edildi`, severity: 'success' });
      } else {
        setSnackbar({ open: true, message: response.error || 'Çalışan aktif edilemedi', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Çalışan aktif edilirken hata oluştu', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: any) => {
    return status === 'active' ? 'success' : 'error';
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'success';
    if (balance < 0) return 'error';
    return 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Çalışan Yönetimi
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Çalışanlarınızı yönetin ve maaş ödemelerini takip edin
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <People />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {Number(activeEmployeesCount) + Number(inactiveEmployeesCount)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toplam Çalışan
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
                  {activeEmployeesCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aktif Çalışan
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                <TrendingDown />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {inactiveEmployeesCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pasif Çalışan
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                <AccountBalance />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  ₺{totalSalary.toLocaleString('tr-TR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {showInactiveEmployees ? 'Pasif Çalışan Maaşı (TL)' : 'Aktif Çalışan Maaşı (TL)'}
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
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                size='medium'
                placeholder="Çalışan adı, telefon, email veya pozisyon ara..."
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
            <Grid size={{ xs: 12, md: 6 }}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setAddDialogOpen(true)}
                  size="large"
                >
                  Çalışan Ekle
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 3, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {showInactiveEmployees ? 'Pasif' : 'Aktif'} Çalışanlar ({totalItems} çalışan)
            </Typography>
            <Button
              variant="outlined"
              onClick={() => {
                setShowInactiveEmployees(!showInactiveEmployees);
                setCurrentPage(1); // Reset to first page when switching
              }}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 2,
                py: 1
              }}
            >
              {showInactiveEmployees ? 'Aktif Çalışanları Göster' : 'Pasif Çalışanları Göster'}
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Ad</TableCell>
                  <TableCell>Pozisyon</TableCell>
                  <TableCell>Telefon</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="right">Maaş</TableCell>
                  <TableCell align="right">Bakiye</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{employee.id}</TableCell>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{employee.phone || '-'}</TableCell>
                    <TableCell>{employee.email || '-'}</TableCell>
                    <TableCell align="right">
                      ₺{(employee.salary || 0).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`₺${(employee.balance || 0).toLocaleString('tr-TR')}`}
                        color={getBalanceColor(employee.balance || 0) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={employee.status === 'active' ? 'Aktif' : 'Pasif'}
                        color={getStatusColor(employee.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="info"
                        title="Detay"
                        onClick={() => navigate(`/employees/${employee.id}`)}
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="primary"
                        title="Düzenle"
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit />
                      </IconButton>
                      {showInactiveEmployees ? (
                        <IconButton
                          size="small"
                          color="success"
                          title="Aktif Et"
                          onClick={() => handleActivateEmployee(employee)}
                          disabled={loading}
                        >
                          <PersonAdd />
                        </IconButton>
                      ) : (
                        <IconButton
                          size="small"
                          color="error"
                          title="Sil"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      {loading ? 'Yükleniyor...' : 'Çalışan bulunamadı'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>




      {/* Add Employee Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Çalışan Ekle</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Çalışan Adı *"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Pozisyon"
                value={newEmployee.position}
                onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Telefon"
                value={newEmployee.phone}
                onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CurrencyInput
                label="Maaş"
                value={newEmployee.salary}
                currency={newEmployee.salaryCurrency}
                onValueChange={(value) => setNewEmployee({ ...newEmployee, salary: value })}
                onCurrencyChange={(currency) => setNewEmployee({ ...newEmployee, salaryCurrency: currency })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>İptal</Button>
          <Button onClick={handleAddEmployee} variant="contained" disabled={loading}>
            {loading ? 'Ekleniyor...' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Çalışan Düzenle</DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Çalışan Adı"
                  value={selectedEmployee.name}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, name: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Pozisyon"
                  value={selectedEmployee.position}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, position: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Telefon"
                  value={selectedEmployee.phone || ''}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, phone: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Maaş"
                  type="number"
                  value={selectedEmployee.salary || 0}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, salary: parseFloat(e.target.value) || 0 })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₺</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={selectedEmployee.email || ''}
                  onChange={(e) => setSelectedEmployee({ ...selectedEmployee, email: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Durum</InputLabel>
                  <Select
                    value={selectedEmployee.status}
                    label="Durum"
                    onChange={(e) => setSelectedEmployee({ ...selectedEmployee, status: e.target.value as 'active' | 'inactive' })}
                  >
                    <MenuItem value="active">Aktif</MenuItem>
                    <MenuItem value="inactive">Pasif</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>İptal</Button>
          <Button onClick={handleUpdateEmployee} variant="contained" disabled={loading}>
            {loading ? 'Güncelleniyor...' : 'Güncelle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => {
        setDeleteDialogOpen(false);
        setSelectedEmployee(null);
      }}>
        <DialogTitle>Çalışanı Sil</DialogTitle>
        <DialogContent>
          <Typography>
            Bu çalışanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </Typography>
          {selectedEmployee && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Çalışan:</strong> {selectedEmployee.name}
              </Typography>
              <Typography variant="body2">
                <strong>Pozisyon:</strong> {selectedEmployee.position}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setSelectedEmployee(null);
          }}>İptal</Button>

          <Button
            color='secondary'
            variant='outlined'
            disabled={loading}
            onClick={() => handleDeactivateEmployee()}>
            Pasif Yap
          </Button>

          <Button onClick={() => {
            console.log('Delete butonu tıklandı, işlem başlıyor');
            handleDeleteEmployee();
          }} color="error" variant="contained" disabled={loading}>
            {loading ? 'Siliniyor...' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalItems / itemsPerPage)}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {/* Snackbar */}
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

export default EmployeeManagement;