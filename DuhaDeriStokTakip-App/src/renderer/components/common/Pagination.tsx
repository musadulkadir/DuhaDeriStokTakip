import React from 'react';
import {
  Box,
  Pagination as MuiPagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  pageSizeOptions?: number[];
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mt: 3,
        p: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
        flexWrap: 'wrap',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Sayfa Başına</InputLabel>
          <Select
            value={itemsPerPage}
            label="Sayfa Başına"
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          {totalItems > 0 
            ? `${startItem}-${endItem} / ${totalItems} kayıt`
            : 'Kayıt bulunamadı'
          }
        </Typography>
      </Box>

      {totalPages > 1 && (
        <MuiPagination
          count={totalPages}
          page={currentPage}
          onChange={(_, page) => onPageChange(page)}
          color="primary"
          shape="rounded"
          showFirstButton
          showLastButton
        />
      )}
    </Box>
  );
};

export default Pagination;