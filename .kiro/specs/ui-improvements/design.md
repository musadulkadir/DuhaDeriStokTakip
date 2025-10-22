# Tasarım Belgesi

## Genel Bakış

Bu tasarım, uygulamanın tüm dropdown bileşenlerini büyütmeyi ve para birimi yönetimini standartlaştırmayı amaçlar.

## Mimari

### UI Bileşen Standardizasyonu
- Tüm dropdown'lar için tutarlı boyutlandırma
- Material-UI size="large" kullanımı
- Minimum yükseklik 56px standardı

### Para Birimi Yönetimi
- Merkezi para birimi sabitleri
- Dropdown bileşeni için standart para birimi listesi
- Varsayılan değer yönetimi

## Bileşenler ve Arayüzler

### Para Birimi Sabitleri
```typescript
export const CURRENCIES = [
  { code: 'TL', name: 'Türk Lirası', symbol: '₺' },
  { code: 'USD', name: 'Amerikan Doları', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' }
];
```

### CurrencySelect Bileşeni
```typescript
interface CurrencySelectProps {
  value: string;
  onChange: (currency: string) => void;
  defaultCurrency?: string;
  label?: string;
}
```

### Dropdown Boyutlandırma Standardı
- size="large" prop'u
- sx={{ minHeight: '56px' }} style
- fullWidth prop'u

## Veri Modelleri

### Güncellenecek Modeller
- EmployeePayment: currency alanı
- Sale: currency alanı  
- CashTransaction: currency alanı (zaten var)

## Hata Yönetimi

- Para birimi seçimi zorunlu
- Geçersiz para birimi değerleri için varsayılan değer kullanımı
- Form validasyonu

## Test Stratejisi

- Dropdown boyutlarının doğru render edilmesi
- Para birimi seçiminin doğru çalışması
- Varsayılan değerlerin doğru yüklenmesi
- Form gönderiminde para birimi verilerinin kaydedilmesi