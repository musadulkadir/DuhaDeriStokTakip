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
import { dbAPI } from '../services/api'; // api dosyanızın yolunu kontrol edin

// Alım kalemleri için bir interface (SaleItem'a benzer)
interface PurchaseItem {
  productId: number;
  productName: string;
  quantityPieces: number; // Adet
  quantityDesi: number; // Desi
  unitPricePerDesi: number; // Desi başı maliyet
  total: number; // Toplam maliyet
}

// Alım ana objesi için interface (Sale'e benzer)
interface Purchase {
  id: number;
  supplierId: number;
  supplierName: string;
  currency: string;
  items: PurchaseItem[];
  total: number;
  date: string;
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
    setPurchaseData(null); // Modalı kapatırken veriyi temizle
    onClose();
  };
  
  const currencySymbol = purchaseData?.currency === 'USD' ? '$' : purchaseData?.currency === 'TRY' ? '₺' : '€';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Alım Detayı - #{purchaseId}
      </DialogTitle>
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {purchaseData && !loading && (
          <Grid container spacing={3}>
            {/* Alım Bilgileri */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Alım Bilgileri
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Tedarikçi"
                        secondary={purchaseData.supplierName}
                      />
                    </ListItem>
                     <ListItem>
                        <ListItemText
                          primary="Tarih"
                          secondary={new Date(purchaseData.date).toLocaleDateString('tr-TR')}
                        />
                      </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Toplam Tutar"
                        secondary={`${currencySymbol}${purchaseData.total.toLocaleString('tr-TR')}`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            {/* Alım Kalemleri */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Alım Kalemleri
                  </Typography>
                  <List dense>
                    {purchaseData.items.map((item, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={item.productName}
                          secondary={`${(item.quantityPieces || 0).toLocaleString('tr-TR')} adet (${(item.quantityDesi || 0).toLocaleString('tr-TR')} desi) × ${currencySymbol}${(item.unitPricePerDesi || 0).toLocaleString('tr-TR')}/desi = ${currencySymbol}${(item.total || 0).toLocaleString('tr-TR')}`}
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

export default PurchaseDetailModal;