# Tasarım Belgesi

## Genel Bakış

Bu tasarım belgesi, ürün ekleme sırasında karşılaşılan beyaz ekran sorununu çözmek için gerekli değişiklikleri detaylandırır. Sorun, eksik TypeScript tip tanımları, Material-UI Grid bileşen yapılandırması ve API yanıt formatı tutarsızlıklarından kaynaklanmaktadır.

## Mimari

### Mevcut Sorunlar
1. **Eksik Models Dosyası**: `../../main/database/models` dosyası mevcut değil
2. **Material-UI Grid Tip Hataları**: Grid bileşenlerinde `item` prop'u tip hatalarına neden oluyor
3. **Renk API Formatı**: Renk verilerinin formatı tutarsız (bazen string array, bazen object array)
4. **TypeScript Derleme Hataları**: Tip uyumsuzlukları nedeniyle derleme başarısız oluyor

### Çözüm Mimarisi
```
electron-vite-app/
├── src/
│   ├── main/
│   │   └── database/
│   │       └── models.ts (YENİ)
│   └── renderer/
│       ├── components/
│       │   └── ProductManagement.tsx (GÜNCELLENECEK)
│       └── services/
│           └── api.ts (GÜNCELLENECEK)
```

## Bileşenler ve Arayüzler

### 1. TypeScript Model Tanımları (models.ts)

**Amaç**: Tüm veritabanı varlıkları ve API yanıtları için tip güvenliği sağlamak

**Arayüzler**:
- `Product`: Ürün varlığı
- `Customer`: Müşteri varlığı  
- `Employee`: Çalışan varlığı
- `Category`: Kategori varlığı
- `Color`: Renk varlığı
- `ApiResponse<T>`: Genel API yanıt formatı
- `PaginatedResponse<T>`: Sayfalanmış API yanıt formatı

### 2. ProductManagement Bileşeni Güncellemeleri

**Sorunlar**:
- Material-UI Grid bileşenlerinde tip hataları
- Renk verilerinin yanlış işlenmesi
- Eksik model importları

**Çözümler**:
- Grid bileşenlerini doğru Material-UI syntax'ı ile güncelleme
- Renk API yanıtlarını tutarlı şekilde işleme
- Doğru model tiplerini import etme

### 3. API Servis Güncellemeleri

**Sorunlar**:
- Model importlarının başarısız olması
- Renk API'sinin tutarsız yanıt formatı

**Çözümler**:
- Model importlarını düzeltme
- Renk API yanıtlarını standartlaştırma

## Veri Modelleri

### Product Interface
```typescript
interface Product {
  id?: number;
  name: string;
  category: string;
  color?: string;
  stock_quantity?: number;
  unit?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}
```

### Color Interface
```typescript
interface Color {
  id: number;
  name: string;
  hex_code?: string;
  created_at?: string;
}
```

### API Response Interfaces
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  error?: string;
}
```

## Hata İşleme

### TypeScript Derleme Hataları
- **Sorun**: Eksik tip tanımları nedeniyle derleme başarısız
- **Çözüm**: Kapsamlı model dosyası oluşturma ve doğru importlar

### Material-UI Grid Hataları
- **Sorun**: Grid bileşenlerinde `item` prop'u tanınmıyor
- **Çözüm**: Material-UI Grid2 kullanımına geçiş veya doğru Grid syntax'ı

### API Yanıt Formatı Hataları
- **Sorun**: Renk API'si tutarsız format döndürüyor
- **Çözüm**: Backend'de tutarlı yanıt formatı sağlama

## Test Stratejisi

### Birim Testleri
- Model tip tanımlarının doğruluğu
- API yanıt formatlarının tutarlılığı
- Bileşen render testleri

### Entegrasyon Testleri
- ProductManagement bileşeninin tam akışı
- API çağrılarının doğru çalışması
- Form gönderimi ve veri güncellemesi

### Manuel Testler
- Ürün ekleme akışının baştan sona test edilmesi
- Farklı tarayıcılarda görüntü kontrolü
- Hata durumlarının test edilmesi

## Performans Değerlendirmeleri

### Derleme Performansı
- TypeScript derleme süresinin optimize edilmesi
- Gereksiz tip kontrollerinin azaltılması

### Runtime Performansı
- Bileşen render performansının korunması
- API çağrı optimizasyonları

## Güvenlik Değerlendirmeleri

### Tip Güvenliği
- Tüm API çağrılarında tip kontrolü
- Runtime'da veri doğrulama

### Veri Doğrulama
- Form girişlerinin doğrulanması
- API yanıtlarının doğrulanması

## Uygulama Detayları

### Adım 1: Model Dosyası Oluşturma
- `src/main/database/models.ts` dosyasını oluştur
- Tüm veritabanı şemasına uygun arayüzleri tanımla
- Export/import yapısını kur

### Adım 2: ProductManagement Güncellemesi
- Material-UI Grid hatalarını düzelt
- Model importlarını güncelle
- Renk işleme mantığını düzelt

### Adım 3: API Servis Güncellemesi
- Model importlarını düzelt
- Tip güvenliğini sağla

### Adım 4: Test ve Doğrulama
- Derleme hatalarını kontrol et
- Ürün ekleme akışını test et
- Beyaz ekran sorununun çözüldüğünü doğrula