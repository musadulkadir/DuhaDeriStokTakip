# Beyaz Ekran Sorunu - Çözüm Rehberi

## Sorun
Windows'ta build alıp .exe dosyasından kurduğunuzda beyaz ekran görünüyor.

## Neden Oluyor?
1. `isDev` değişkeni her zaman `true` olarak ayarlanmış
2. Production'da yanlış dosya yolu kullanılıyor
3. Vite build dosyaları doğru yerde değil

## ✅ Çözüm (Yapıldı)

### 1. main.js Düzeltildi
```javascript
// ÖNCE:
const isDev = true; // ❌ Her zaman dev modu

// SONRA:
const isDev = !app.isPackaged; // ✅ Build edilmişse production
```

### 2. Windows Dosya Yolu Düzeltildi
```javascript
// Windows'ta backslash'leri forward slash'e çevir
const indexPath = path.join(__dirname, '../../dist-react/index.html');
htmlPath = `file://${indexPath.replace(/\\/g, '/')}`;
```

### 3. DevTools Eklendi
Production'da da hataları görmek için DevTools açık.

## 🔨 Yeniden Build Alma

### Adım 1: Temizlik
```cmd
rmdir /s /q dist
rmdir /s /q dist-react
```

### Adım 2: Otomatik Build
```cmd
build-windows.bat
```

VEYA Manuel:

```cmd
# React build
npm run build:react

# Electron build
npm run build:win
```

## 🧪 Test Etme

### 1. Dosyaları Kontrol Et
```cmd
test-production.bat
```

Şunları kontrol eder:
- ✓ dist-react/index.html var mı?
- ✓ dist-react/assets var mı?
- ✓ src/main/main.js var mı?
- ✓ node_modules/electron var mı?

### 2. Build Sonrası Test
```cmd
# dist klasöründeki .exe dosyasını çalıştır
cd dist
"Duha Deri Stok Takip-1.0.0-x64.exe"
```

### 3. DevTools'da Hataları Kontrol Et
Uygulama açıldığında F12 tuşuna basın ve Console'a bakın.

## 🐛 Hala Beyaz Ekran mı?

### Kontrol Listesi:

1. **dist-react klasörü var mı?**
   ```cmd
   dir dist-react
   ```
   Yoksa: `npm run build:react`

2. **index.html var mı?**
   ```cmd
   type dist-react\index.html
   ```
   Yoksa: Vite build başarısız olmuş

3. **Console'da hata var mı?**
   - F12 tuşuna basın
   - Console sekmesine bakın
   - Kırmızı hataları not edin

4. **Dosya yolu doğru mu?**
   Console'da şunu görmelisiniz:
   ```
   PRODUCTION MODU: Yükleniyor: file:///C:/path/to/dist-react/index.html
   Index path exists: true
   ```

## 🔍 Yaygın Hatalar

### "Cannot find module"
```cmd
# node_modules'u yeniden yükle
rmdir /s /q node_modules
npm install
```

### "Failed to load resource"
```cmd
# Vite build'i yeniden al
rmdir /s /q dist-react
npm run build:react
```

### "Uncaught ReferenceError"
- React build'de hata var
- `npm run build:react` çıktısını kontrol et

## 📝 Build Öncesi Checklist

- [ ] `npm install` yapıldı mı?
- [ ] PostgreSQL çalışıyor mu?
- [ ] `.env` dosyası var mı?
- [ ] `isDev = !app.isPackaged` olarak ayarlandı mı?
- [ ] Eski build dosyaları temizlendi mi?

## 🚀 Başarılı Build Sonrası

Kurulum dosyası burada olacak:
```
dist/Duha Deri Stok Takip-1.0.0-x64.exe
```

Çalıştırdığınızda:
1. Splash screen görünecek
2. Login ekranı gelecek (şifre kapalıysa direkt giriş)
3. Dashboard açılacak

## 💡 İpuçları

1. **Her build öncesi temizlik yapın:**
   ```cmd
   rmdir /s /q dist dist-react
   ```

2. **Build loglarını okuyun:**
   Hata varsa build sırasında gösterilir

3. **DevTools'u kullanın:**
   Production'da da F12 ile hataları görebilirsiniz

4. **Antivirus'ü kontrol edin:**
   Bazı antivirüsler .exe dosyasını engelleyebilir
