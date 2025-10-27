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
    setSaleData(null); // Modalı kapatırken veriyi temizle
    onClose();
  };
  
  const currencySymbol = saleData?.currency === 'USD' ? '$' : saleData?.currency === 'TRY' ? '₺' : '€';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Satış Detayı - #{saleId}
      </DialogTitle>
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {saleData && !loading && (
          <Grid container spacing={3}>
            {/* Bu kısım, SalesManagement.tsx'teki modal içeriğinizin aynısı */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Satış Bilgileri
                  </Typography>
                  <List dense>
                    {/* ... (ListItem'ler buraya) ... */}
                    <ListItem>
                      <ListItemText
                        primary="Müşteri"
                        secondary={saleData.customerName}
                      />
                    </ListItem>
                     <ListItem>
                        <ListItemText
                          primary="Tarih"
                          secondary={new Date(saleData.date).toLocaleDateString('tr-TR')}
                        />
                      </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Toplam Tutar"
                        secondary={`${currencySymbol}${saleData.total.toLocaleString('tr-TR')}`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Satış Kalemleri
                  </Typography>
                  <List dense>
                    {saleData.items.map((item, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={item.productName}
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                {`${(item.quantityPieces || 0).toLocaleString('tr-TR')} adet`}
                              </Typography>
                              <Typography variant="body2">
                                {`${(item.quantityDesi || 0).toLocaleString('tr-TR')} desi`}
                              </Typography>
                              <Typography variant="body2">
                                {`Birim Fiyat: ${currencySymbol}${(item.unitPricePerDesi || 0).toLocaleString('tr-TR')}/desi`}
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {`Toplam: ${currencySymbol}${(item.total || 0).toLocaleString('tr-TR')}`}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Kapat</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SaleDetailModal;