import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Security,
  CloudUpload,
  Download,
  Info,
  Lock,
  LockOpen,
  Visibility,
  VisibilityOff,
  Edit,
  Save,
} from '@mui/icons-material';

const Settings: React.FC = () => {
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [backupMessage, setBackupMessage] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [restoreMessage, setRestoreMessage] = useState('');
  
  // Şifre yönetimi
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordEnabled, setPasswordEnabled] = useState(false);
  const [passwordProtectionEnabled, setPasswordProtectionEnabled] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    // Şifre durumunu kontrol et
    const password = localStorage.getItem('app_password');
    const protectionEnabled = localStorage.getItem('passwordEnabled') !== 'false';
    setPasswordEnabled(!!password);
    setPasswordProtectionEnabled(protectionEnabled);
  }, []);

  const handleTogglePasswordProtection = () => {
    if (passwordProtectionEnabled) {
      // Şifre korumasını kapat
      if (!passwordEnabled) {
        // Şifre yoksa direkt kapat
        localStorage.setItem('passwordEnabled', 'false');
        setPasswordProtectionEnabled(false);
        alert('Şifre koruması kapatıldı!');
      } else {
        // Şifre varsa önce doğrula
        const password = prompt('Şifre korumasını kapatmak için şifrenizi girin:');
        const savedPassword = localStorage.getItem('app_password');
        if (password === savedPassword) {
          localStorage.setItem('passwordEnabled', 'false');
          setPasswordProtectionEnabled(false);
          alert('Şifre koruması kapatıldı!');
        } else {
          alert('Hatalı şifre!');
        }
      }
    } else {
      // Şifre korumasını aç
      if (!passwordEnabled) {
        alert('Önce bir şifre ayarlamalısınız!');
        setPasswordDialogOpen(true);
      } else {
        localStorage.setItem('passwordEnabled', 'true');
        setPasswordProtectionEnabled(true);
        alert('Şifre koruması açıldı!');
      }
    }
  };

  const handleSetPassword = () => {
    setPasswordError('');
    
    if (passwordEnabled && !currentPassword) {
      setPasswordError('Mevcut şifreyi girin');
      return;
    }

    if (passwordEnabled) {
      const savedPassword = localStorage.getItem('app_password');
      if (savedPassword !== currentPassword) {
        setPasswordError('Mevcut şifre yanlış');
        return;
      }
    }

    if (!newPassword || newPassword.length < 4) {
      setPasswordError('Şifre en az 4 karakter olmalı');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Şifreler eşleşmiyor');
      return;
    }

    localStorage.setItem('app_password', newPassword);
    localStorage.setItem('passwordEnabled', 'true');
    setPasswordEnabled(true);
    setPasswordProtectionEnabled(true);
    setPasswordDialogOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    alert('Şifre başarıyla ayarlandı ve koruma aktif edildi!');
  };

  const handleRemovePassword = () => {
    if (!currentPassword) {
      setPasswordError('Mevcut şifreyi girin');
      return;
    }

    const savedPassword = localStorage.getItem('app_password');
    if (savedPassword !== currentPassword) {
      setPasswordError('Şifre yanlış');
      return;
    }

    localStorage.removeItem('app_password');
    localStorage.setItem('passwordEnabled', 'false');
    setPasswordEnabled(false);
    setPasswordProtectionEnabled(false);
    setPasswordDialogOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    alert('Şifre kaldırıldı ve koruma kapatıldı!');
  };

  const handleBackup = async () => {
    setBackupStatus('loading');
    setBackupMessage('Yedekleme başlatılıyor...');
    
    try {
      const result = await window.require('electron').ipcRenderer.invoke('backup:start');
      
      if (result.success) {
        setBackupStatus('success');
        setBackupMessage('Yedekleme başarıyla tamamlandı!');
      } else {
        setBackupStatus('error');
        setBackupMessage(result.message || 'Yedekleme başarısız oldu');
      }
    } catch (error: any) {
      setBackupStatus('error');
      setBackupMessage('Yedekleme sırasında hata oluştu: ' + error.message);
    }
    
    setTimeout(() => {
      setBackupStatus('idle');
    }, 3000);
  };

  const handleRestore = async (filePath: string) => {
    const confirmed = window.confirm(
      '⚠️ UYARI: Yedek geri yükleme işlemi mevcut tüm verileri silecek ve yedeği geri yükleyecektir.\n\n' +
      'Bu işlem geri alınamaz!\n\n' +
      'Devam etmek istediğinizden emin misiniz?'
    );

    if (!confirmed) return;

    setRestoreStatus('loading');
    setRestoreMessage('Yedek geri yükleniyor... Lütfen bekleyin.');

    try {
      const result = await window.require('electron').ipcRenderer.invoke('backup:restore', filePath);
      
      if (result.success) {
        setRestoreStatus('success');
        setRestoreMessage('Yedek başarıyla geri yüklendi! Uygulama yeniden başlatılacak...');
        
        // 3 saniye sonra uygulamayı yeniden başlat
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        setRestoreStatus('error');
        setRestoreMessage(result.message || 'Yedek geri yüklenemedi');
      }
    } catch (error: any) {
      setRestoreStatus('error');
      setRestoreMessage('Geri yükleme sırasında hata oluştu: ' + error.message);
    }
    
    setTimeout(() => {
      if (restoreStatus !== 'success') {
        setRestoreStatus('idle');
      }
    }, 5000);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
          Ayarlar
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Güvenlik ve yedekleme ayarlarını yönetin
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        {/* Güvenlik Ayarları */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Security sx={{ color: 'warning.main', mr: 2, fontSize: 32 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Güvenlik
              </Typography>
            </Box>

            {/* Şifre Koruma Açma/Kapama */}
            <Box sx={{ mb: 3, p: 2, bgcolor: passwordProtectionEnabled ? 'success.light' : 'grey.100', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {passwordProtectionEnabled ? (
                    <Lock sx={{ color: 'success.main', mr: 1 }} />
                  ) : (
                    <LockOpen sx={{ color: 'text.secondary', mr: 1 }} />
                  )}
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      Şifre Koruması
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {passwordProtectionEnabled ? 'Açık - Giriş için şifre gerekli' : 'Kapalı - Direkt giriş'}
                    </Typography>
                  </Box>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={passwordProtectionEnabled}
                      onChange={handleTogglePasswordProtection}
                      color="success"
                    />
                  }
                  label=""
                />
              </Box>
              
              {/* Şifre Ayarlama Butonu */}
              <Button
                fullWidth
                variant={passwordEnabled ? 'outlined' : 'contained'}
                startIcon={passwordEnabled ? <Edit /> : <Lock />}
                onClick={() => setPasswordDialogOpen(true)}
                size="small"
              >
                {passwordEnabled ? 'Şifreyi Değiştir' : 'Şifre Ayarla'}
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            <List>
              <ListItem>
                <ListItemIcon>
                  <Security sx={{ color: 'success.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Veritabanı Şifresi"
                  secondary="PostgreSQL veritabanınız şifre ile korunmaktadır"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CloudUpload sx={{ color: 'success.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary="AWS S3 Yedekleme"
                  secondary="Verileriniz güvenli AWS S3 bulut depolamada yedeklenmektedir"
                />
              </ListItem>
            </List>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Güvenlik İpucu:</strong> Düzenli olarak yedekleme yapın ve şifrenizi güvenli bir yerde saklayın.
              </Typography>
            </Alert>
          </CardContent>
        </Card>

        {/* Yedekleme & Veri */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <CloudUpload sx={{ color: 'success.main', mr: 2, fontSize: 32 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Yedekleme & Veri
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<CloudUpload />}
                onClick={handleBackup}
                disabled={backupStatus === 'loading'}
                size="large"
              >
                {backupStatus === 'loading' ? 'Yedekleniyor...' : 'Yedek Oluştur'}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<Download />}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.sql,.backup';
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleRestore(file.path);
                    }
                  };
                  input.click();
                }}
                disabled={restoreStatus === 'loading'}
                size="large"
              >
                {restoreStatus === 'loading' ? 'Geri Yükleniyor...' : 'Yedek Geri Yükle'}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Info sx={{ fontSize: 20, color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Yedekleme Konumu"
                  secondary="C:\Users\Public\duha_deri_backups"
                  secondaryTypographyProps={{ 
                    sx: { 
                      fontSize: '0.75rem',
                      wordBreak: 'break-all'
                    } 
                  }}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CloudUpload sx={{ fontSize: 20, color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText
                  primary="AWS S3 Yedekleme"
                  secondary="Otomatik günlük yedekleme aktif"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Info sx={{ fontSize: 20, color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Yedek Saklama"
                  secondary="Son 30 günlük yedekler saklanır"
                />
              </ListItem>
            </List>

            {backupStatus !== 'idle' && (
              <Alert 
                severity={backupStatus === 'success' ? 'success' : backupStatus === 'error' ? 'error' : 'info'}
                sx={{ mt: 2 }}
              >
                {backupMessage}
              </Alert>
            )}

            {restoreStatus !== 'idle' && (
              <Alert 
                severity={restoreStatus === 'success' ? 'success' : restoreStatus === 'error' ? 'error' : 'warning'}
                sx={{ mt: 2 }}
              >
                {restoreMessage}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Şifre Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {passwordEnabled ? 'Şifre Değiştir / Kaldır' : 'Uygulama Şifresi Ayarla'}
        </DialogTitle>
        <DialogContent>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}

          {passwordEnabled && (
            <TextField
              fullWidth
              label="Mevcut Şifre"
              type={showPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}

          <TextField
            fullWidth
            label="Yeni Şifre"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mb: 2 }}
            helperText="En az 4 karakter"
          />

          <TextField
            fullWidth
            label="Yeni Şifre (Tekrar)"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          {passwordEnabled && (
            <Button onClick={handleRemovePassword} color="error">
              Şifreyi Kaldır
            </Button>
          )}
          <Button onClick={() => setPasswordDialogOpen(false)}>
            İptal
          </Button>
          <Button onClick={handleSetPassword} variant="contained" startIcon={<Save />}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
