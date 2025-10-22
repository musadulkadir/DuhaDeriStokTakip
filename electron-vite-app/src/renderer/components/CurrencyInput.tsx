import React from 'react';
import {
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Box,
} from '@mui/material';

interface CurrencyInputProps {
  label: string;
  value: string;
  currency: 'USD' | 'TRY' | 'EUR';
  onValueChange: (value: string) => void;
  onCurrencyChange: (currency: 'USD' | 'TRY' | 'EUR') => void;
  fullWidth?: boolean;
  required?: boolean;
  disabled?: boolean;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  currency,
  onValueChange,
  onCurrencyChange,
  fullWidth = true,
  required = false,
  disabled = false,
}) => {
  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'USD': return '$';
      case 'TRY': return '₺';
      case 'EUR': return '€';
      default: return '$';
    }
  };

  const getCurrencyName = (curr: string) => {
    switch (curr) {
      case 'USD': return 'Dolar';
      case 'TRY': return 'Türk Lirası';
      case 'EUR': return 'Euro';
      default: return 'Dolar';
    }
  };

  return (
    <Grid container spacing={1} alignItems="end">
      <Grid item xs={8}>
        <TextField
          fullWidth={fullWidth}
          label={label}
          type="number"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          required={required}
          disabled={disabled}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {getCurrencySymbol(currency)}
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      <Grid item xs={4}>
        <FormControl fullWidth disabled={disabled}>
          <InputLabel>Para Birimi</InputLabel>
          <Select
            value={currency}
            label="Para Birimi"
            onChange={(e) => onCurrencyChange(e.target.value as 'USD' | 'TRY' | 'EUR')}
          >
            <MenuItem value="USD">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                $ USD
              </Box>
            </MenuItem>
            <MenuItem value="TRY">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                ₺ TRY
              </Box>
            </MenuItem>
            <MenuItem value="EUR">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                € EUR
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
};

export default CurrencyInput;