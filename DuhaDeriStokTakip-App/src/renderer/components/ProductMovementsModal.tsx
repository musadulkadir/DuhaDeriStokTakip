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
import { formatDate } from '../utils/dateUtils';

interface ProductMovementsModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  type?: 'product' | 'material';
}

interface Movement {
  id?: number;
  product_id?: number;
  material_id?: number;
  movement_type: 'in' | 'out';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_type?: string;
  reference_id?: number;
  customer_id?: number;
  supplier_id?: number;
  unit_price?: number;
  total_amount?: number;
  currency?: string;
  notes?: string;
  user?: string;
  created_at: string;
}

const ProductMovementsModal: React.FC<ProductMovementsModalProps> = ({ open, onClose, product, type = 'product' }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);

  const formatNumberWithCommas = (value: number | string): string => {
    if (value === null || value === undefined || value === '') return '0';
    const num = Number(value);
    if (isNaN(num)) return '0';
    
    // Sayıyı string'e çevir
    const numStr = num.toFixed(2);
    const parts = numStr.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Tam kısmı üç haneli ayraçlarla formatla
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // Ondalık kısım varsa ekle (sıfır değilse)
    return decimalPart && parseInt(decimalPart) > 0 
      ? `${formattedInteger}.${decimalPart}` 
      : formattedInteger;
  };

  const loadMovements = async (itemId: number, itemType: 'product' | 'material') => {
    setLoading(true);
    console.log('🔍 Loading movements:', { itemId, itemType });
    try {
      const response = itemType === 'material' 
        ? await dbAPI.getMaterialMovementsByMaterial(itemId)
        : await dbAPI.getStockMovementsByProduct(itemId);
      
      console.log('📦 Movements response:', { itemType, success: response.success, count: response.data?.length });
      
      if (response.success) {
        setMovements((response.data || []) as Movement[]);
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
      loadMovements(product.id, type);
    }
  }, [product, type]);

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
          Stok Geçmişi: {product.name || `${product.category}${product.color ? ` - ${product.color}` : ''}`}
        </Typography>
        <TableContainer component={Paper} sx={{ mt: 2, maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Tarih</TableCell>
                <TableCell>Tip</TableCell>
                <TableCell align="right">Miktar ({type === 'material' ? 'kg' : 'adet'})</TableCell>
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
                      {formatDate(movement.created_at)}
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
                        label={movement.movement_type === 'in' ? `+${formatNumberWithCommas(movement.quantity)}` : `-${formatNumberWithCommas(Math.abs(movement.quantity))}`}
                        color={movement.movement_type === 'in' ? 'success' : 'error'}
                        size="small"
                      />
                      <Typography variant="caption" display="block" color="text.secondary">
                        {formatNumberWithCommas(movement.previous_stock)} → {formatNumberWithCommas(movement.new_stock)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {movement.notes || 'Açıklama yok'}
                      {movement.total_amount && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Tutar: {movement.currency === 'USD' ? '$' : '₺'}{formatNumberWithCommas(movement.total_amount)}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Bu {type === 'material' ? 'malzemeye' : 'ürüne'} ait stok hareketi bulunamadı.
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
