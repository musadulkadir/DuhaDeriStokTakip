# Duha Deri Stok Takip Uygulaması

Modern ve kullanıcı dostu deri stok ve cari takip uygulaması.

## Özellikler

- 📦 **Stok Yönetimi**: Deri ürünlerinin stok takibi
- 👥 **Müşteri Yönetimi**: Müşteri bilgileri ve cari hesap takibi
- 💰 **Satış İşlemleri**: Satış kayıtları ve faturalandırma
- 💵 **Kasa Yönetimi**: Nakit giriş-çıkış işlemleri
- 👨‍💼 **Çalışan Yönetimi**: Personel bilgileri ve maaş takibi
- 📊 **Raporlama**: Detaylı satış, stok ve müşteri raporları
- 🎨 **Modern Arayüz**: Material-UI ile tasarlanmış kullanıcı dostu arayüz

## Teknolojiler

- **Frontend**: React 19, TypeScript, Material-UI
- **Backend**: Electron, Node.js
- **Veritabanı**: SQLite3
- **Build Tool**: Vite
- **Styling**: Tailwind CSS

## Kurulum

### Gereksinimler
- Node.js (v16 veya üzeri)
- npm veya yarn

### Adımlar

1. Projeyi klonlayın:
```bash
git clone <repository-url>
cd DuhaDeriStokTakip-App
```

2. Bağımlılıkları yükleyin:
```bash
npm install
```

3. Geliştirme modunda çalıştırın:
```bash
npm run dev
```

4. Üretim için build alın:
```bash
npm run build
```

## Kullanım

### Geliştirme Modu
```bash
npm run dev
```
Bu komut hem React development server'ını hem de Electron uygulamasını başlatır.

### Üretim Build
```bash
npm run build
```
Bu komut uygulamayı paketler ve `dist` klasörüne çıktı verir.

## Proje Yapısı

```
DuhaDeriStokTakip-App/
├── src/
│   ├── main/           # Electron main process
│   │   └── main.js     # Ana Electron dosyası
│   └── renderer/       # React frontend
│       ├── components/ # React bileşenleri
│       ├── services/   # API servisleri
│       └── index.tsx   # Ana React dosyası
├── dist-react/         # Build çıktıları
├── package.json
└── README.md
```

## Veritabanı

Uygulama SQLite veritabanı kullanır. Veritabanı dosyası kullanıcının home dizininde `DuhaDeriStokTakip-Data` klasörü altında saklanır.

### Tablolar
- `customers` - Müşteri bilgileri
- `products` - Ürün bilgileri
- `employees` - Çalışan bilgileri
- `sales` - Satış kayıtları
- `sale_items` - Satış detayları
- `stock_movements` - Stok hareketleri
- `cash_transactions` - Kasa işlemleri
- `customer_payments` - Müşteri ödemeleri
- `employee_payments` - Çalışan ödemeleri

## Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add some amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## İletişim

Proje hakkında sorularınız için iletişime geçebilirsiniz.