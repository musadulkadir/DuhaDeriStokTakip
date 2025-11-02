# Windows Sorun Giderme Rehberi

## Hızlı Test

1. `windows-test-db.bat` dosyasını çalıştırın
2. Hataları okuyun ve aşağıdaki çözümleri uygulayın

## Yaygın Sorunlar ve Çözümleri

### 1. "psql komutu bulunamadı"

**Sorun:** PostgreSQL PATH'e eklenmemiş

**Çözüm:**
1. Windows Arama'da "Ortam Değişkenleri" yazın
2. "Sistem ortam değişkenlerini düzenle" seçin
3. "Ortam Değişkenleri" butonuna tıklayın
4. "Path" değişkenini seçip "Düzenle" tıklayın
5. "Yeni" butonuna tıklayıp şunu ekleyin:
   ```
   C:\Program Files\PostgreSQL\14\bin
   ```
6. Tüm pencereleri "Tamam" ile kapatın
7. CMD/PowerShell'i yeniden başlatın

### 2. "PostgreSQL servisi çalışmıyor"

**Sorun:** PostgreSQL servisi başlatılmamış

**Çözüm 1 - Services.msc:**
1. Windows + R tuşlarına basın
2. `services.msc` yazıp Enter'a basın
3. "postgresql-x64-14" servisini bulun
4. Sağ tıklayıp "Start" seçin
5. Sağ tıklayıp "Properties" > "Startup type: Automatic" yapın

**Çözüm 2 - Komut Satırı (Yönetici olarak):**
```cmd
net start postgresql-x64-14
```

### 3. "Veritabanına bağlanılamadı - Şifre hatası"

**Sorun:** PostgreSQL şifre gerektiriyor

**Çözüm 1 - .env Dosyası:**
1. Proje klasöründe `.env` dosyasını açın
2. Şifrenizi ekleyin:
   ```
   DB_PASSWORD=your_password_here
   ```

**Çözüm 2 - pg_hba.conf Düzenleme:**
1. Dosyayı açın: `C:\Program Files\PostgreSQL\14\data\pg_hba.conf`
2. Şu satırı bulun:
   ```
   host    all    all    127.0.0.1/32    md5
   ```
3. `md5` yerine `trust` yazın:
   ```
   host    all    all    127.0.0.1/32    trust
   ```
4. PostgreSQL servisini yeniden başlatın:
   ```cmd
   net stop postgresql-x64-14
   net start postgresql-x64-14
   ```

### 4. "Port 5432 zaten kullanımda"

**Sorun:** Başka bir uygulama 5432 portunu kullanıyor

**Çözüm 1 - Portu Değiştir:**
1. `.env` dosyasında:
   ```
   DB_PORT=5433
   ```
2. PostgreSQL'in portunu da değiştirin:
   - `postgresql.conf` dosyasını açın
   - `port = 5433` yapın
   - Servisi yeniden başlatın

**Çözüm 2 - Çakışan Uygulamayı Bul:**
```cmd
netstat -ano | findstr :5432
taskkill /PID [PID_NUMARASI] /F
```

### 5. "Veritabanı oluşturulamadı"

**Sorun:** İzin hatası veya bağlantı sorunu

**Çözüm:**
```cmd
# Yönetici olarak CMD açın
cd "C:\Program Files\PostgreSQL\14\bin"

# Manuel oluştur
createdb -U postgres duha_deri_db

# Eğer şifre isterse:
set PGPASSWORD=your_password
createdb -U postgres duha_deri_db
```

### 6. "Electron uygulaması açılmıyor"

**Sorun:** Antivirus engelliyor

**Çözüm:**
1. Windows Defender > Virüs ve tehdit koruması
2. "Virüs ve tehdit koruması ayarları"
3. "Dışlamalar" > "Dışlama ekle veya kaldır"
4. Proje klasörünü ekleyin

### 7. "npm install hatası"

**Sorun:** Node.js veya npm güncel değil

**Çözüm:**
```cmd
# Node.js versiyonunu kontrol et
node --version

# En az v16 olmalı, değilse güncelleyin:
# https://nodejs.org/

# npm'i güncelle
npm install -g npm@latest

# Temiz kurulum
rmdir /s /q node_modules
del package-lock.json
npm install
```

## Manuel Veritabanı Kurulumu

Eğer otomatik kurulum çalışmazsa:

```cmd
# 1. PostgreSQL'e bağlan
psql -U postgres

# 2. Veritabanı oluştur
CREATE DATABASE duha_deri_db;

# 3. Çıkış
\q

# 4. Tabloları oluştur (proje klasöründe)
psql -U postgres duha_deri_db -f migrations/create_tables.sql
```

## Performans Sorunları

### PostgreSQL Ayarları

`C:\Program Files\PostgreSQL\14\data\postgresql.conf` dosyasını düzenleyin:

```conf
# Bellek ayarları (8GB RAM için)
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 32MB

# Bağlantı ayarları
max_connections = 100

# Checkpoint ayarları
checkpoint_completion_target = 0.9
wal_buffers = 16MB
```

Servisi yeniden başlatın:
```cmd
net stop postgresql-x64-14
net start postgresql-x64-14
```

## Loglara Bakma

### PostgreSQL Logları
```
C:\Program Files\PostgreSQL\14\data\log\
```

### Uygulama Logları
Electron DevTools'da Console sekmesine bakın (F12)

## Hala Çalışmıyor mu?

1. PostgreSQL'i tamamen kaldırın
2. Bilgisayarı yeniden başlatın
3. PostgreSQL'i yeniden kurun
4. Kurulum sırasında:
   - Port: 5432
   - Locale: English, United States
   - Şifre: Boş bırakın veya basit bir şifre belirleyin
5. `windows-test-db.bat` çalıştırın

## İletişim

Sorun devam ederse:
- PostgreSQL versiyonunu kontrol edin: `psql --version`
- Windows versiyonunu kontrol edin: `winver`
- Hata mesajlarının ekran görüntüsünü alın
