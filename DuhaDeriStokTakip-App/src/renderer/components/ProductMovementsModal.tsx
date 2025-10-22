import React, { useEffect, useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Product } from '../../main/database/models';
import { dbAPI } from '../services/api';

interface ProductMovementsModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

interface StockMovement {
  id: number;
  product_id: number;
  movement_type: 'in' | 'out';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_type?: string;
  reference_id?: number;
  customer_id?: number;
  unit_price?: number;
  total_amount?: number;
  notes?: string;
  user?: string;
  created_at: string;
}


const ProductMovementsModal: React.FC<ProductMovementsModalProps> = ({ open, onClose, product }) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMovements = async (productId: number) => {
    setLoading(true);
    try {
      const response = await dbAPI.getStockMovementsByProduct(productId);
      if (response.success) {
        setMovements(response.data);
      } else {
        console.error('Failed to load movements:', response.error);
        setMovements([]);
      }
    } catch (error) {
      console.error('Error loading movements:', error);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (product && product.id) {
      loadMovements(product.id);
    }
  }, [product]);

  // Pencereyi ortalamak için stil
  const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '60%',
    minWidth: 600,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
  };

  if (!product) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="product-movements-modal-title"
    >
      <Box sx={style}>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
        <Typography id="product-movements-modal-title" variant="h6" component="h2">
          Stok Geçmişi: {`${product.category} - ${product.color}`}
        </Typography>
        <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Tarih</TableCell>
                <TableCell>Tip</TableCell>
                <TableCell align="right">Miktar</TableCell>
                <TableCell>Açıklama</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : movements.length > 0 ? (
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {new Date(movement.created_at).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={movement.movement_type === 'in' ? 'Giriş' : 'Çıkış'}
                        color={movement.movement_type === 'in' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={movement.movement_type === 'in' ? `+${movement.quantity}` : `-${movement.quantity}`}
                        color={movement.movement_type === 'in' ? 'success' : 'error'}
                        size="small"
                      />
                      <Typography variant="caption" display="block" color="text.secondary">
                        {movement.previous_stock} → {movement.new_stock}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {movement.notes || 'Açıklama yok'}
                      {movement.total_amount && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Tutar: ${movement.total_amount.toLocaleString()}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Bu ürüne ait stok hareketi bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Modal>
  );
};

export default ProductMovementsModal;