import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { dbAPI } from '../services/api';

// Alım kalemleri için interface
interface PurchaseItem {
  productId: number;
  productName: string;
  quantity: number; // kg
  unitPrice: number; // Birim fiyat
  total: number; // Toplam tutar
}

// Alım ana objesi için interface
interface Purchase {
  id: number;
  supplierId: number;
  supplierName: string;
  currency: string;
  items: PurchaseItem[];
  total: number;
  date: string;
  notes?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  purchaseId: number | null; // Gösterilecek alımın ID'si
}

const PurchaseDetailModal: React.FC<Props> = ({ open, onClose, purchaseId }) => {
  const [purchaseData, setPurchaseData] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Modal açıldığında ve geçerli bir purchaseId olduğunda veriyi çek
    if (open && purchaseId) {
      const fetchPurchase = async () => {
        setLoading(true);
        setPurchaseData(null);
        try {
          // 2. Adımda oluşturacağımız yeni API fonksiyonu
          const response = await dbAPI.getPurchaseById(purchaseId);
          if (response.success) {
            setPurchaseData(response.data);
          } else {
            console.error(response.error);
          }
        } catch (error) {
          console.error('Alım detayı çekilemedi:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchPurchase();
    }
  }, [open, purchaseId]); // 'open' ve 'purchaseId' değiştiğinde tetiklenir

  const handleClose = () => {
    setPurchaseData(null);
    onClose();
  };
  
  const currencySymbol = purchaseData?.currency === 'USD' ? '$' : purchaseData?.currency === 'EUR' ? '€' : '₺';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
        Alım Detayı #{purchaseId}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {purchaseData && !loading && (
          <Box>
            {/* Alım Bilgileri */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Alım Bilgileri
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Tedarikçi
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {purchaseData.supplierName}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Tarih
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {new Date(purchaseData.date).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Toplam Tutar
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {currencySymbol}{purchaseData.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Grid>
                  {purchaseData.notes && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Notlar
                      </Typography>
                      <Typography variant="body1">
                        {purchaseData.notes}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Alım Kalemleri */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Alım Kalemleri ({purchaseData.items.length} kalem)
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Malzeme</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Miktar (kg)</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Birim Fiyat</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Toplam</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {purchaseData.items.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell align="right">
                            {item.quantity.toLocaleString('tr-TR')} kg
                          </TableCell>
                          <TableCell align="right">
                            {currencySymbol}{item.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {currencySymbol}{item.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} align="right" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                          Genel Toplam:
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'primary.main' }}>
                          {currencySymbol}{purchaseData.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="contained">
          Kapat
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PurchaseDetailModal;