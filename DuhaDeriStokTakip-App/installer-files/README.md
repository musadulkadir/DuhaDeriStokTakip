# Kurulum Paketi İçeriği

Bu klasör, Windows kullanıcıları için kurulum dosyalarını içerir.

## 📦 Paket İçeriği

```
installer-files/
├── Duha Deri Stok Takip.exe    # Ana uygulama
├── setup-database.bat           # Veritabanı kurulum scripti
├── KURULUM_REHBERI.txt         # Detaylı kurulum rehberi
└── PostgreSQL-14-windows.url   # PostgreSQL indirme linki (opsiyonel)
```

## 🚀 Hızlı Başlangıç

1. **PostgreSQL Kur** (eğer yoksa)
2. **setup-database.bat** çalıştır
3. **Duha Deri Stok Takip.exe** çalıştır

## 📋 Kurulum Paketi Hazırlama

Build aldıktan sonra kurulum paketi oluşturmak için:

```cmd
# 1. Build al
build-windows.bat

# 2. Kurulum klasörü oluştur
mkdir release
mkdir release\installer-files

# 3. Dosyaları kopyala
copy dist\*.exe release\installer-files\
copy installer-files\setup-database.bat release\installer-files\
copy installer-files\KURULUM_REHBERI.txt release\installer-files\

# 4. ZIP oluştur
# Windows Explorer'da release klasörünü sağ tık > Sıkıştır
# Veya 7-Zip/WinRAR kullan
```

## 📤 Kullanıcıya Dağıtım

### Seçenek 1: ZIP Dosyası
```
Duha-Deri-Stok-Takip-v1.0.0.zip
└── installer-files/
    ├── Duha Deri Stok Takip.exe
    ├── setup-database.bat
    └── KURULUM_REHBERI.txt
```

### Seçenek 2: USB/Flash
Tüm `installer-files` klasörünü USB'ye kopyala

### Seçenek 3: Cloud (Google Drive, Dropbox)
ZIP dosyasını yükle ve link paylaş

## 🔧 Kullanıcı Talimatları

Kullanıcıya şunu söyle:

1. **ZIP'i aç** veya **USB'den kopyala**
2. **KURULUM_REHBERI.txt** dosyasını oku
3. Adımları takip et

## 💡 Önemli Notlar

- ✅ Tablolar otomatik oluşur (ilk açılışta)
- ✅ Şifre sistemi varsayılan kapalı
- ✅ PostgreSQL servisi otomatik başlar
- ⚠️ Antivirus uyarısı çıkabilir (güvenli listeye ekle)
- ⚠️ Windows Defender SmartScreen uyarısı (Yine de çalıştır)

## 🐛 Yaygın Sorunlar

**"PostgreSQL bulunamadı"**
→ PostgreSQL kurulu değil, önce kur

**"Veritabanı oluşturulamadı"**
→ PostgreSQL servisi çalışmıyor, başlat

**"Beyaz ekran"**
→ F12 tuşuna bas, Console'daki hatayı kontrol et

## 📞 Destek

Kullanıcı sorun yaşarsa:
1. setup-database.bat çıktısını iste
2. F12 > Console ekran görüntüsü iste
3. PostgreSQL versiyonunu sor: `psql --version`
