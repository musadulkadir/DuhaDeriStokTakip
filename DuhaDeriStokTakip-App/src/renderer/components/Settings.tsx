import React, { useState, useEffect } from 'react';
import { dbAPI } from '../services/api';
import {
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Switch,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Notifications,
  Security,
  Backup,
  Palette,
  Language,
  Storage,
  Info,
  Edit,
  Delete,
  Add,
  CloudUpload,
  Download,
  Refresh,
} from '@mui/icons-material';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    autoBackup: false,
    darkMode: true,
    language: 'tr',
    currency: 'TRY',
    lowStockThreshold: 20,
    autoSave: true,
    soundEffects: false,
    passwordEnabled: localStorage.getItem('passwordEnabled') === 'true', // Default false (kapalı)
  });

  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Şifre değiştirme
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Şifre veritabanında saklanıyor
  const RECOVERY_PASSWORD = '6508';
  const [storedPassword, setStoredPasswordState] = useState('admin123');

  // Şifreyi veritabanından yükle
  useEffect(() => {
    const loadPassword = async () => {
      try {
        const response = await dbAPI.getPassword();
        if (response.success && response.data) {
          setStoredPasswordState(response.data);
        }
      } catch (error) {
        console.error('Şifre yüklenemedi:', error);
      }
    };
    loadPassword();
  }, []);

  const handleSettingChange = (setting: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));

    // Şifre ayarını localStorage'a kaydet
    if (setting === 'passwordEnabled') {
      localStorage.setItem('passwordEnabled', value.toString());
    }
  };

  const handleSaveSettings = () => {
    // Ayarları kaydetme mantığı
    console.log('Ayarlar kaydedildi:', settings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleChangePassword = async () => {
    setPasswordError('');

    // Validasyon
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Tüm alanları doldurun');
      return;
    }

    // Mevcut şifre veya kurtarma şifresi kontrolü
    if (currentPassword !== storedPassword && currentPassword !== RECOVERY_PASSWORD) {
      setPasswordError('Mevcut şifre veya kurtarma şifresi hatalı');
      return;
    }

    // Yeni şifre kontrolü
    if (newPassword.length < 4) {
      setPasswordError('Yeni şifre en az 4 karakter olmalı');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Yeni şifreler eşleşmiyor');
      return;
    }

    try {
      // Şifreyi veritabanına kaydet
      const response = await dbAPI.setPassword(newPassword);
      if (!response.success) {
        throw new Error(response.error || 'Şifre kaydedilemedi');
      }

      setStoredPasswordState(newPassword);
      setPasswordSuccess(true);
      setPasswordDialogOpen(false);

      // Formu temizle
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error) {
      setPasswordError('Şifre kaydedilirken hata oluştu');
      console.error('Şifre kaydetme hatası:', error);
    }
  };

  const users = [
    { id: 1, name: 'Ahmet Yılmaz', role: 'Admin', email: 'ahmet@example.com', active: true },
    { id: 2, name: 'Mehmet Demir', role: 'Kullanıcı', email: 'mehmet@example.com', active: true },
    { id: 3, name: 'Fatma Kaya', role: 'Kullanıcı', email: 'fatma@example.com', active: false },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Ayarlar
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Uygulama ayarlarınızı yönetin
        </Typography>
      </Box>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Ayarlar başarıyla kaydedildi!
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* General Settings */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Notifications />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Genel Ayarlar
                </Typography>
              </Box>

              <List>
                <ListItem>
                  <ListItemIcon>
                    <Notifications />
                  </ListItemIcon>
                  <ListItemText
                    primary="Bildirimler"
                    secondary="Stok uyarıları ve sistem bildirimleri"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.notifications}
                      onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <Backup />
                  </ListItemIcon>
                  <ListItemText
                    primary="Otomatik Yedekleme"
                    secondary="Günlük otomatik veri yedekleme"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.autoBackup}
                      onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <Palette />
                  </ListItemIcon>
                  <ListItemText
                    primary="Koyu Tema"
                    secondary="Koyu renk temasını kullan"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.darkMode}
                      onChange={(e) => handleSettingChange('darkMode', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <Storage />
                  </ListItemIcon>
                  <ListItemText
                    primary="Otomatik Kaydetme"
                    secondary="Değişiklikleri otomatik kaydet"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.autoSave}
                      onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Application Settings */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <Language />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Uygulama Ayarları
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Dil"
                    value={settings.language}
                    onChange={(e) => handleSettingChange('language', e.target.value)}
                  >
                    <MenuItem value="tr">Türkçe</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="de">Deutsch</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Para Birimi"
                    value={settings.currency}
                    onChange={(e) => handleSettingChange('currency', e.target.value)}
                  >
                    <MenuItem value="TRY">₺ Türk Lirası</MenuItem>
                    <MenuItem value="USD">$ Amerikan Doları</MenuItem>
                    <MenuItem value="EUR">€ Euro</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Düşük Stok Uyarı Eşiği"
                    value={settings.lowStockThreshold}
                    onChange={(e) => handleSettingChange('lowStockThreshold', parseInt(e.target.value))}
                    helperText="Bu değerin altındaki stoklar için uyarı gösterilir"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Password Management */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                  <Security />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Güvenlik
                </Typography>
              </Box>

              {passwordSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Şifre başarıyla değiştirildi!
                </Alert>
              )}

              <List>
                <ListItem>
                  <ListItemIcon>
                    <Security />
                  </ListItemIcon>
                  <ListItemText
                    primary="Şifre Koruması"
                    secondary="Uygulama açılışında şifre iste"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.passwordEnabled}
                      onChange={(e) => handleSettingChange('passwordEnabled', e.target.checked)}
                      color="error"
                    />
                  </ListItemSecondaryAction>
                </ListItem>

                <ListItem disabled={!settings.passwordEnabled}>
                  <ListItemIcon>
                    <Security />
                  </ListItemIcon>
                  <ListItemText
                    primary="Şifre Değiştir"
                    secondary="Giriş şifrenizi değiştirin"
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setPasswordDialogOpen(true)}
                      disabled={!settings.passwordEnabled}
                    >
                      Değiştir
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>

                <Divider sx={{ my: 2 }} />

                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant="body2" color="text.secondary">
                        <strong>Kurtarma Şifresi:</strong> 6508
                      </Typography>
                    }
                    secondary="Şifrenizi unutursanız bu kodu kullanabilirsiniz"
                  />
                </ListItem>

                {!settings.passwordEnabled && (
                  <ListItem>
                    <Alert severity="warning" sx={{ width: '100%' }}>
                      <Typography variant="body2">
                        <strong>Uyarı:</strong> Şifre koruması kapalı. Geliştirme modunda kullanın.
                      </Typography>
                    </Alert>
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* User Management & Backup */}
        <Grid item xs={12} lg={6}>
          {/* User Management */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <Security />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Kullanıcı Yönetimi
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={() => setUserDialogOpen(true)}
                >
                  Kullanıcı Ekle
                </Button>
              </Box>

              <List>
                {users.map((user) => (
                  <ListItem key={user.id}>
                    <ListItemIcon>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {user.name.charAt(0)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {user.name}
                          <Chip
                            label={user.role}
                            size="small"
                            color={user.role === 'Admin' ? 'primary' : 'default'}
                          />
                          {!user.active && (
                            <Chip label="Pasif" size="small" color="error" />
                          )}
                        </Box>
                      }
                      secondary={user.email}
                    />
                    <ListItemSecondaryAction>
                      <IconButton size="small">
                        <Edit />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Backup & Data */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <Backup />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Yedekleme & Veri
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<CloudUpload />}
                    onClick={() => setBackupDialogOpen(true)}
                  >
                    Yedek Oluştur
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={() => {
                      // Yedek geri yükleme işlemi
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.db,.sqlite';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          alert(`Yedek dosyası "${file.name}" geri yükleniyor...`);
                        }
                      };
                      input.click();
                    }}
                  >
                    Yedek Geri Yükle
                  </Button>
                </Grid>

              </Grid>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Info sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Son yedekleme: 25 Ocak 2024, 14:30
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Storage sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Veritabanı boyutu: 2.4 MB
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
          sx={{
            px: 4,
            py: 1.5,
            background: 'linear-gradient(135deg, #8D6E63 0%, #6D4C41 100%)',
          }}
        >
          Tüm Ayarları Kaydet
        </Button>
      </Box>

      {/* Backup Dialog */}
      <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)}>
        <DialogTitle>Yedek Oluştur</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Tüm verilerinizin yedeğini oluşturmak istediğinizden emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bu işlem birkaç dakika sürebilir ve mevcut tüm ürün, stok ve hareket verilerini içerecektir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>İptal</Button>
          <Button
            variant="contained"
            onClick={() => {
              // Yedekleme işlemi
              alert('Yedek oluşturuluyor... Bu işlem birkaç saniye sürebilir.');
              setTimeout(() => {
                alert('Yedek başarıyla oluşturuldu!');
                setBackupDialogOpen(false);
              }, 2000);
            }}
          >
            Yedek Oluştur
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Ad Soyad" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="E-posta" type="email" />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Rol"
                defaultValue="Kullanıcı"
              >
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Kullanıcı">Kullanıcı</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Şifre" type="password" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={() => setUserDialogOpen(false)}>
            Kullanıcı Ekle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Şifre Değiştir</DialogTitle>
        <DialogContent>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mevcut Şifre veya Kurtarma Şifresi"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                helperText="Kurtarma şifresi: 6508"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Yeni Şifre"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="En az 4 karakter"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Yeni Şifre (Tekrar)"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPasswordDialogOpen(false);
            setPasswordError('');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          }}>
            İptal
          </Button>
          <Button variant="contained" onClick={handleChangePassword}>
            Şifreyi Değiştir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;