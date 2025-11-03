import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { CloudUpload, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';

interface BackupScreenProps {
  onComplete: () => void;
}

const BackupScreen: React.FC<BackupScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Yedekleme başlatılıyor...');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    startBackup();
  }, []);

  const startBackup = async () => {
    try {
      // IPC ile backup işlemini başlat
      const result = await window.require('electron').ipcRenderer.invoke('backup:start');

      if (result.success) {
        setStatus('success');
        setMessage('Yedekleme başarıyla tamamlandı!');
        setProgress(100);
        
        // 2 saniye sonra uygulamaya devam et
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        setStatus('error');
        setErrorMessage(result.message || 'Yedekleme başarısız oldu');
        
        // 5 saniye sonra uygulamaya devam et (hata olsa bile)
        setTimeout(() => {
          onComplete();
        }, 5000);
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('Yedekleme sırasında beklenmeyen bir hata oluştu');
      
      setTimeout(() => {
        onComplete();
      }, 5000);
    }
  };

  // Progress güncellemelerini dinle
  useEffect(() => {
    const ipcRenderer = window.require('electron').ipcRenderer;
    
    const handleProgress = (_: any, data: { message: string; progress: number }) => {
      setMessage(data.message);
      setProgress(data.progress);
    };

    ipcRenderer.on('backup:progress', handleProgress);

    return () => {
      ipcRenderer.removeListener('backup:progress', handleProgress);
    };
  }, []);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 9999,
      }}
    >
      <Card sx={{ minWidth: 400, maxWidth: 600 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            {status === 'loading' && (
              <CloudUpload sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            )}
            {status === 'success' && (
              <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            )}
            {status === 'error' && (
              <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            )}

            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              {status === 'loading' && 'Veritabanı Yedekleniyor'}
              {status === 'success' && 'Yedekleme Tamamlandı'}
              {status === 'error' && 'Yedekleme Başarısız'}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {status === 'loading' && 'Lütfen bekleyin, işlem devam ediyor...'}
              {status === 'success' && 'Verileriniz güvenle buluta yedeklendi'}
              {status === 'error' && errorMessage}
            </Typography>
          </Box>

          {status === 'loading' && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {message} ({progress}%)
              </Typography>
            </Box>
          )}

          {status === 'loading' && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {status === 'error' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
              Uygulama 5 saniye içinde açılacak...
            </Typography>
          )}

          {status === 'success' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
              Uygulama 2 saniye içinde açılacak...
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default BackupScreen;
