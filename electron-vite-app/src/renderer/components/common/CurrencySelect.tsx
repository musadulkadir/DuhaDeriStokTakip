import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography
} from '@mui/material';
import { CURRENCIES, Currency } from '../../constants/currencies';

interface CurrencySelectProps {
  value: string;
  onChange: (currency: string) => void;
  defaultCurrency?: string;
  label?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
  required?: boolean;
}

const CurrencySelect: React.FC<CurrencySelectProps> = ({
  value,
  onChange,
  defaultCurrency,
  label = 'Para Birimi',
  fullWidth = true,
  size = 'large',
  required = false
}) => {
  return (
    <FormControl fullWidth={fullWidth} size={size} required={required}>
      <InputLabel id="currency-select-label">{label}</InputLabel>
      <Select
        labelId="currency-select-label"
        value={value || defaultCurrency || ''}
        label={label}
        onChange={(e) => onChange(e.target.value)}
        sx={{ minHeight: '56px' }}
      >
        {CURRENCIES.map((currency: Currency) => (
          <MenuItem key={currency.code} value={currency.code}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {currency.symbol}
              </Typography>
              <Typography variant="body2">
                {currency.code} - {currency.name}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default CurrencySelect;