// Para birimi sabitleri ve yardımcı fonksiyonlar

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'TL', name: 'Türk Lirası', symbol: '₺' },
  { code: 'USD', name: 'Amerikan Doları', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' }
];

export const DEFAULT_CURRENCIES = {
  EMPLOYEE_PAYMENT: 'TL',
  SALES: 'USD',
  CASH_TRANSACTION: 'USD'
};

export const getCurrencyByCode = (code: string): Currency | undefined => {
  return CURRENCIES.find(currency => currency.code === code);
};

export const formatCurrency = (amount: number, currencyCode: string): string => {
  const currency = getCurrencyByCode(currencyCode);
  if (!currency) return `${amount}`;
  
  return `${currency.symbol}${amount.toLocaleString('tr-TR', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};