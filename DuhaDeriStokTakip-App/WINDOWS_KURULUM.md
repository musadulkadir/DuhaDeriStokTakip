# Windows Kurulum Rehberi - Duha Deri Stok Takip

## Gereksinimler

### 1. PostgreSQL Kurulumu

**Adım 1: PostgreSQL İndir**
- https://www.postgresql.org/download/windows/ adresinden PostgreSQL 14 veya üstünü indirin
- Installer'ı çalıştırın

**Adım 2: Kurulum Ayarları**
- Port: `5432` (varsayılan)
- Superuser şifresi: Boş bırakabilirsiniz veya bir şifre belirleyin
- Locale: `Turkish, Turkey` veya `English, United States`

**Adım 3: PostgreSQL'i Başlatın**
```cmd
# Windows Services'ten PostgreSQL'i başlatın
# veya komut satırından:
net start postgresql-x64-14
```

### 2. Veritabanı Oluşturma

**PowerShell veya CMD'de:**
```cmd
# PostgreSQL bin klasörüne gidin (genellikle):
cd "C:\Program Files\PostgreSQL\14\bin"

# Veritabanı oluşturun
createdb -U postgres duha_deri_db

# Tabloları oluşturun (proje klasöründe)
psql -U postgres duha_deri_db -f init-database.sql
```

### 3. Ortam Değişkenleri (Opsiyonel)

Eğer PostgreSQL farklı ayarlarla kuruluysa, `.env` dosyası oluşturun:

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=duha_deri_db
DB_PASSWORD=your_password_here
DB_PORT=5432
```

## Uygulamayı Çalıştırma

### Geliştirme Modu
```cmd
npm install
npm start
```

### Production Build
```cmd
npm run build
```

Build tamamlandıktan sonra `dist` klasöründe `.exe` dosyası oluşacak.

## Sorun Giderme

### PostgreSQL Bağlantı Hatası
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Çözüm:**
1. PostgreSQL servisinin çalıştığından emin olun:
   ```cmd
   net start postgresql-x64-14
   ```

2. Windows Firewall'da PostgreSQL'e izin verin

3. `pg_hba.conf` dosyasını kontrol edin:
   - Konum: `C:\Program Files\PostgreSQL\14\data\pg_hba.conf`
   - Şu satırı ekleyin:
     ```
     host    all    all    127.0.0.1/32    trust
     ```

### Port Zaten Kullanımda
```
Error: Port 5432 is already in use
```

**Çözüm:**
1. Başka bir PostgreSQL instance'ı kapatın
2. Veya farklı bir port kullanın (`.env` dosyasında `DB_PORT=5433`)

### Şifre Hatası
```
Error: password authentication failed
```

**Çözüm:**
1. `.env` dosyasında doğru şifreyi belirtin
2. Veya `pg_hba.conf` dosyasında `md5` yerine `trust` kullanın

## Windows'a Özel Notlar

1. **Antivirus**: Bazı antivirüsler Electron uygulamalarını engelleyebilir. Uygulamayı güvenli listesine ekleyin.

2. **Yönetici İzni**: Uygulama normal kullanıcı olarak çalışır, yönetici izni gerektirmez.

3. **Veritabanı Yedekleme**:
   ```cmd
   pg_dump -U postgres duha_deri_db > backup.sql
   ```

4. **Veritabanı Geri Yükleme**:
   ```cmd
   psql -U postgres duha_deri_db < backup.sql
   ```

## Performans İpuçları

1. **PostgreSQL Ayarları** (`postgresql.conf`):
   ```
   shared_buffers = 256MB
   effective_cache_size = 1GB
   maintenance_work_mem = 64MB
   ```

2. **Windows Defender Exclusion**:
   - PostgreSQL data klasörünü taramadan hariç tutun
   - Uygulama klasörünü taramadan hariç tutun

## Destek

Sorun yaşarsanız:
1. `logs` klasöründeki hata loglarını kontrol edin
2. PostgreSQL loglarını kontrol edin: `C:\Program Files\PostgreSQL\14\data\log`
