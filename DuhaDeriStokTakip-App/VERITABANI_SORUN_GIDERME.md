# Veritabanı Sorun Giderme Kılavuzu

## PostgreSQL Bağlantı Sorunları

Eğer uygulama "Veritabanı bağlantısı kurulamadı" hatası veriyorsa:

### 1. PostgreSQL Durumunu Kontrol Et

Terminal'i aç ve şu komutu çalıştır:

```bash
brew services list | grep postgres
```

Eğer `stopped` veya `error` görüyorsan, PostgreSQL çalışmıyor demektir.

### 2. PostgreSQL'i Başlat

```bash
brew services restart postgresql@14
```

### 3. Bağlantıyı Test Et

```bash
psql -U musadulkadir -d duha_deri_db
```

Eğer bağlanabiliyorsan, veritabanı çalışıyor demektir. `\q` yazarak çıkabilirsin.

### 4. Lock Dosyası Sorunu

Eğer "lock file already exists" hatası alıyorsan:

```bash
rm -f /opt/homebrew/var/postgresql@14/postmaster.pid
brew services restart postgresql@14
```

### 5. PostgreSQL'i Otomatik Başlat

Bilgisayar her açıldığında PostgreSQL'in otomatik başlaması için:

```bash
brew services start postgresql@14
```

## Sık Karşılaşılan Hatalar

### ECONNREFUSED (Bağlantı Reddedildi)

**Sebep:** PostgreSQL çalışmıyor.

**Çözüm:**
```bash
brew services restart postgresql@14
```

### Database does not exist (Veritabanı yok)

**Sebep:** Veritabanı oluşturulmamış.

**Çözüm:**
```bash
createdb -U musadulkadir duha_deri_db
```

### Permission denied (İzin hatası)

**Sebep:** Kullanıcı yetkisi yok.

**Çözüm:**
```bash
psql postgres
CREATE USER musadulkadir WITH SUPERUSER;
\q
```

## Acil Durum: Manuel Veritabanı Başlatma

Eğer hiçbir şey işe yaramazsa:

1. PostgreSQL'i tamamen durdur:
```bash
brew services stop postgresql@14
```

2. Eski process'leri temizle:
```bash
pkill -9 postgres
rm -f /opt/homebrew/var/postgresql@14/postmaster.pid
```

3. Yeniden başlat:
```bash
brew services start postgresql@14
```

4. 5 saniye bekle ve uygulamayı aç.

## Otomatik Düzeltme

Uygulama artık veritabanı bağlantısı kesildiğinde:
- ✅ Otomatik olarak PostgreSQL'i başlatmaya çalışır
- ✅ 3 kez yeniden bağlanma denemesi yapar
- ✅ Kullanıcıya bildirim gösterir

## Destek

Sorun devam ederse:
1. Terminal'de `brew services list` çıktısını al
2. `/opt/homebrew/var/log/postgresql@14.log` dosyasının son 50 satırını kontrol et:
   ```bash
   tail -50 /opt/homebrew/var/log/postgresql@14.log
   ```
3. Hata mesajlarını not al ve destek ekibine ilet
