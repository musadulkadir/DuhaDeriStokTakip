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

// SalesManagement.tsx içindeki Sale ve SaleItem interface'lerini
// ortak bir 'types.ts' dosyasına taşıyıp buradan import edebilirsiniz.
// Şimdilik kopyalıyorum:
interface SaleItem {
  productId: number;
  productName: string;
  quantityPieces: number;
  quantityDesi: number;
  unitPricePerDesi: number;
  total: number;
}

interface Sale {
  id: number;
  customerId: number;
  customerName: string;
  currency: string;
  items: SaleItem[];
  total: number;
  date: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  saleId: number | null; // Gösterilecek satışın ID'si
}

const SaleDetailModal: React.FC<Props> = ({ open, onClose, saleId }) => {
  const [saleData, setSaleData] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Modal açıldığında ve geçerli bir saleId olduğunda veriyi çek
    if (open && saleId) {
      const fetchSale = async () => {
        setLoading(true);
        setSaleData(null);
        try {
          // 2. Adım'da oluşturduğumuz yeni API fonksiyonu
          const response = await dbAPI.getSaleById(saleId); 
          if (response.success) {
            // Not: dbAPI.getSaleById'nin 'Sale' formatında veri döndürdüğünü varsayıyoruz
            setSaleData(response.data); 
          } else {
            console.error(response.error);
          }
        } catch (error) {
          console.error('Satış detayı çekilemedi:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchSale();
    }
  }, [open, saleId]); // 'open' ve 'saleId' değiştiğinde tetiklenir

  const handleClose = () => {
    setSaleData(null);
    onClose();
  };
  
  const currencySymbol = saleData?.currency === 'USD' ? '$' : saleData?.currency === 'EUR' ? '€' : '₺';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
        Satış Detayı #{saleId}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {saleData && !loading && (
          <Box>
            {/* Satış Bilgileri */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Satış Bilgileri
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Müşteri
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {saleData.customerName}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">
                      Tarih
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {new Date(saleData.date).toLocaleDateString('tr-TR', {
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
                      {currencySymbol}{saleData.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Satış Kalemleri */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Satış Kalemleri ({saleData.items.length} kalem)
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>Ürün</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Adet</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Desi</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Birim Fiyat/Desi</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Toplam</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {saleData.items.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell align="right">
                            {Number(item.quantityPieces).toLocaleString('tr-TR')} adet
                          </TableCell>
                          <TableCell align="right">
                            {Number(item.quantityDesi).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} desi
                          </TableCell>
                          <TableCell align="right">
                            {currencySymbol}{Number(item.unitPricePerDesi).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {currencySymbol}{Number(item.total).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={4} align="right" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                          Genel Toplam:
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'primary.main' }}>
                          {currencySymbol}{saleData.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

export default SaleDetailModal;