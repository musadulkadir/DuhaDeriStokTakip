# AWS S3 Otomatik Yedekleme Kurulumu

Bu dokümanda, uygulamanızın veritabanını otomatik olarak AWS S3'e yedeklemek için gerekli adımlar açıklanmaktadır.

## 1. AWS S3 Kurulumu (Adım Adım)

### ADIM 1: AWS Hesabı Oluşturma

1. **Tarayıcınızı açın** ve şu adrese gidin: https://aws.amazon.com/
2. **"Create an AWS Account"** butonuna tıklayın
3. **Email adresinizi** girin ve **"Verify email address"** tıklayın
4. **Doğrulama kodunu** email'inizden alıp girin
5. **Şifre oluşturun** (güçlü bir şifre)
6. **AWS account name** girin (örn: `Duha Deri`)
7. **Kişisel bilgilerinizi** doldurun
8. **Kredi kartı bilgilerinizi** girin
   - ⚠️ İlk 12 ay **Free Tier** (ücretsiz katman) kullanabilirsiniz
   - S3'te ilk 5 GB depolama ÜCRETSİZ
   - Otomatik ücretlendirme YAPILMAZ (limitleri aşmadığınız sürece)
9. **Telefon doğrulaması** yapın
10. **Support plan** olarak **"Basic support - Free"** seçin
11. ✅ Hesap oluşturuldu!

### ADIM 2: AWS Console'a Giriş

1. https://console.aws.amazon.com/ adresine gidin
2. **Root user** seçin
3. **Email** ve **şifrenizi** girin
4. ✅ AWS Console'a giriş yaptınız!

### ADIM 3: S3 Bucket Oluşturma

1. **Üst arama çubuğuna** `S3` yazın
2. **S3** servisine tıklayın
3. **"Create bucket"** butonuna tıklayın (turuncu buton)

4. **Bucket Ayarları:**

   **a) Bucket name:**
   - İsim girin: `duha-deri-backups-2024` (benzersiz olmalı)
   - ⚠️ Bucket ismi DÜNYA ÇAPINDA benzersiz olmalı!
   - Eğer "already exists" hatası alırsanız: `duha-deri-backups-firma-2024` gibi değiştirin

   **b) AWS Region:**
   - **Türkiye için en yakın:** `Europe (Frankfurt) eu-central-1`
   - Veya: `Europe (Ireland) eu-west-1`

   **c) Object Ownership:**
   - **ACLs disabled** seçili bırakın (varsayılan)

   **d) Block Public Access:**
   - **Block all public access** ✅ İŞARETLİ BIRAKIN
   - ⚠️ Yedekleriniz private olmalı!

   **e) Bucket Versioning:**
   - **Disable** seçili bırakın

   **f) Default encryption:**
   - **Server-side encryption with Amazon S3 managed keys (SSE-S3)** seçin
   - ✅ Yedekleriniz şifrelenecek

   **g) Advanced settings:**
   - Varsayılan ayarları bırakın

5. **"Create bucket"** butonuna tıklayın (en altta)

6. ✅ Bucket oluşturuldu! Şimdi boş bir bucket göreceksiniz.

### ADIM 4: IAM User (Kullanıcı) Oluşturma

IAM User, uygulamanızın AWS'ye bağlanması için gereken "robot kullanıcı"dır.

1. **Üst arama çubuğuna** `IAM` yazın
2. **IAM** servisine tıklayın
3. Sol menüden **"Users"** seçin
4. **"Create user"** butonuna tıklayın

5. **Step 1 - User details:**
   - **User name:** `duha-deri-backup-user`
   - **"Provide user access to the AWS Management Console"** ✅ İŞARETSİZ BIRAKIN
   - **Next** butonuna tıklayın

6. **Step 2 - Set permissions:**
   - **"Attach policies directly"** seçin
   - Arama kutusuna **"S3"** yazın
   - **"AmazonS3FullAccess"** politikasını bulun ve ✅ işaretleyin
   - ⚠️ Daha güvenli için sadece kendi bucket'ınıza erişim verin (opsiyonel)
   - **Next** butonuna tıklayın

7. **Step 3 - Review and create:**
   - Ayarları kontrol edin
   - **"Create user"** butonuna tıklayın

8. ✅ User oluşturuldu!

### ADIM 5: Access Keys (Erişim Anahtarları) Oluşturma

Bu anahtarlar uygulamanızın AWS'ye bağlanması için şifre görevi görür.

1. **Users** listesinde az önce oluşturduğunuz kullanıcıya tıklayın
2. **"Security credentials"** sekmesine gidin
3. **"Access keys"** bölümüne inin
4. **"Create access key"** butonuna tıklayın

5. **Step 1 - Access key best practices:**
   - **"Application running outside AWS"** seçin
   - En alttaki ✅ **"I understand..."** kutusunu işaretleyin
   - **Next** butonuna tıklayın

6. **Step 2 - Set description tag:**
   - **Description:** `Duha Deri Backup App`
   - **Create access key** butonuna tıklayın

7. **Step 3 - Retrieve access keys:**
   - 🔑 **Access key ID** göreceksiniz (örn: `AKIAIOSFODNN7EXAMPLE`)
   - 🔐 **Secret access key** göreceksiniz (örn: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
   
   ⚠️ **ÇOK ÖNEMLİ:**
   - Bu anahtarları **HEMEN NOT EDİN!**
   - **Secret access key** sadece BU SEFER gösterilecek!
   - Kaybederseniz yeni anahtar oluşturmanız gerekir!

8. **"Download .csv file"** butonuna tıklayın (yedek olarak)
9. **Done** butonuna tıklayın

### ADIM 6: Özet - Ne Yaptık?

✅ AWS hesabı açtık
✅ S3 Bucket oluşturduk → Bucket adını not ettik
✅ IAM User oluşturduk
✅ S3 Full Access izni verdik
✅ Access Keys oluşturduk → Anahtarları not ettik

**Şimdi elimizde olması gerekenler:**
1. ✅ Bucket adı (örn: `duha-deri-backups-2024`)
2. ✅ AWS Region (örn: `eu-central-1`)
3. ✅ Access Key ID (örn: `AKIAIOSFODNN7EXAMPLE`)
4. ✅ Secret Access Key (örn: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)

---

## 2. Uygulama Kurulumu (Adım Adım)

### ADIM 7: .env Dosyasını Düzenleme

1. **Proje klasöründe `.env` dosyasını açın**
   - Not Defteri veya VS Code ile açabilirsiniz

2. **En alta şu satırları ekleyin/güncelleyin:**

```env
# AWS S3 Backup Ayarları
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE              ← ADIM 5'te aldığınız Access Key ID
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG...      ← ADIM 5'te aldığınız Secret Access Key
AWS_REGION=eu-central-1                              ← ADIM 3'te seçtiğiniz Region
AWS_BUCKET_NAME=duha-deri-backups-2024               ← ADIM 3'te oluşturduğunuz Bucket adı
```

3. **Gerçek Örnek:**
```env
# Eğer Access Key ID'niz: AKIAZQR5EXAMPLE12345
# Eğer Secret Key'iniz: abc123XYZ/secretkey/example
# Eğer Region'ınız: eu-central-1
# Eğer Bucket adınız: duha-deri-backups-2024
# O zaman:

AWS_ACCESS_KEY_ID=AKIAZQR5EXAMPLE12345
AWS_SECRET_ACCESS_KEY=abc123XYZ/secretkey/example
AWS_REGION=eu-central-1
AWS_BUCKET_NAME=duha-deri-backups-2024
```

4. **Dosyayı kaydedin** (Ctrl+S)

⚠️ **GÜVENLİK UYARISI:**
- `.env` dosyasını ASLA kimseyle paylaşmayın!
- `.env` dosyasını ASLA Git'e commit etmeyin!
- Access keys'leri ASLA internete yüklemeyin!

### ADIM 8: Gerekli Paketleri Yükleme

1. **Terminal/Komut İstemi'ni açın**
2. **Proje klasörüne gidin:**
```bash
cd DuhaDeriStokTakip-App
```

3. **Paketleri yükleyin:**
```bash
npm install
```

4. **Yükleme tamamlanana kadar bekleyin** (2-3 dakika)

### ADIM 9: PostgreSQL pg_dump Kontrolü

Yedekleme için `pg_dump` komutu gereklidir.

**Windows:**
```bash
pg_dump --version
```

**Eğer "komut bulunamadı" hatası alırsanız:**
- PostgreSQL zaten yüklü ama PATH'e eklenmemiş
- Şu klasörü PATH'e ekleyin: `C:\Program Files\PostgreSQL\14\bin`

**macOS:**
```bash
brew install postgresql
pg_dump --version
```

**Linux:**
```bash
sudo apt-get install postgresql-client
pg_dump --version
```

### ADIM 10: Test Etme

1. **Uygulamayı başlatın:**
```bash
npm start
```

2. **İlk açılışta:**
   - Uygulama yedekleme gerekip gerekmediğini kontrol edecek
   - İlk kez çalıştırıyorsanız yedekleme başlayacak
   - Yedekleme ekranını göreceksiniz

3. **Yedekleme başarılı olursa:**
   - ✅ "Yedekleme tamamlandı!" mesajı
   - Uygulama normal şekilde açılacak

4. **Hata alırsanız:**
   - Console'da hata mesajlarını kontrol edin
   - Aşağıdaki "Sorun Giderme" bölümüne bakın

### ADIM 11: Yedeklemeyi AWS S3'te Kontrol Etme

1. **AWS Console'a gidin:** https://console.aws.amazon.com/
2. **S3 servisine gidin**
3. **Bucket'ınıza tıklayın:** `duha-deri-backups-2024`
4. **`backups/` klasörünü açın**
5. **Yedek dosyasını göreceksiniz:**
   ```
   duha_deri_backup_2024-01-15T10-30-00-000Z.sql
   ```

✅ **Tebrikler! AWS S3 otomatik yedekleme sistemi çalışıyor!**

---

## 3. Yedekleme Nasıl Çalışır?

### 3.1. Otomatik Yedekleme

- Uygulama her açıldığında otomatik olarak kontrol edilir
- Eğer bugün yedekleme yapılmamışsa, yedekleme başlar
- Kullanıcıya yedekleme ekranı gösterilir
- Yedekleme tamamlanana kadar uygulama kullanılamaz

### 3.2. Yedekleme Süreci

1. **AWS S3 Bağlantısı** (10%)
   - Access keys ile AWS'ye bağlanılır

2. **Veritabanı Yedeği Oluşturma** (30%)
   - PostgreSQL veritabanı `pg_dump` ile yedeklenir
   - Yerel geçici klasöre kaydedilir

3. **S3'e Yükleme** (60%)
   - Yedek dosyası AWS S3'e yüklenir
   - Yerel dosya silinir

4. **Eski Yedekleri Temizleme** (90%)
   - 30 günden eski yedekler otomatik silinir
   - Sadece son 30 günün yedekleri tutulur

5. **Tamamlanma** (100%)
   - Kullanıcı uygulamayı kullanmaya devam eder

### 3.3. Yedekleme Konumu

Yedekler şu formatta saklanır:

```
s3://duha-deri-backups-2024/backups/duha_deri_backup_2024-01-15T10-30-00-000Z.sql
```

---

## 4. Yedekten Geri Yükleme

### 4.1. AWS S3'ten İndirme

1. **AWS Console** > **S3** > Bucket'ınız
2. `backups/` klasöründen istediğiniz yedeği bulun
3. Yedek dosyasını seçin
4. **"Download"** butonuna tıklayın

### 4.2. Veritabanını Geri Yükleme

```bash
# Önce mevcut veritabanını silin (DİKKAT!)
dropdb -h localhost -p 5432 -U postgres duha_deri_db

# Yeni veritabanı oluşturun
createdb -h localhost -p 5432 -U postgres duha_deri_db

# Yedeği geri yükleyin
pg_restore -h localhost -p 5432 -U postgres -d duha_deri_db backup.sql
```

---

## 5. Sorun Giderme

### Hata: "AWS credentials bulunamadı"

**Çözüm:** 
- `.env` dosyasında `AWS_ACCESS_KEY_ID` ve `AWS_SECRET_ACCESS_KEY` doğru mu kontrol edin
- Anahtarlarda boşluk veya özel karakter var mı kontrol edin

### Hata: "Access Denied"

**Çözüm:** 
- IAM User'a **AmazonS3FullAccess** izni verildiğinden emin olun
- Bucket adı doğru mu kontrol edin

### Hata: "Bucket does not exist"

**Çözüm:** 
- `.env` dosyasındaki `AWS_BUCKET_NAME` doğru mu kontrol edin
- Bucket gerçekten oluşturuldu mu AWS Console'dan kontrol edin

### Hata: "pg_dump: command not found"

**Çözüm:** 
- PostgreSQL client tools'u yükleyin (ADIM 9'a bakın)

### Yedekleme Çok Uzun Sürüyor

**Çözüm:** 
- İnternet bağlantınızı kontrol edin
- Veritabanı boyutunu kontrol edin
- Bucket'ın region'unu size yakın bir yere değiştirin

---

## 6. Maliyet

AWS S3 Free Tier (İlk 12 ay):
- **Depolama:** İlk 5 GB ÜCRETSİZ
- **PUT İstekleri:** İlk 2,000 istek ÜCRETSİZ
- **GET İstekleri:** İlk 20,000 istek ÜCRETSİZ

Free Tier Sonrası (eu-central-1):
- **Depolama:** ~$0.023/GB/ay
- **PUT İstekleri:** $0.005 per 1,000 istek
- **GET İstekleri:** $0.0004 per 1,000 istek

**Örnek:** 100 MB veritabanı × 30 gün = ~$0.07/ay (Free Tier sonrası)

---

## 7. Güvenlik Notları

⚠️ **ÖNEMLİ GÜVENLİK UYARILARI:**

1. **Access keys'leri asla paylaşmayın!**
2. **`.env` dosyasını Git'e commit etmeyin!**
3. **Bucket'ı public yapmayın!**
4. **IAM User'a sadece gerekli izinleri verin**
5. **Düzenli olarak yedekleri kontrol edin**
6. **Access keys'leri düzenli olarak yenileyin (6 ayda bir)**

---

## 8. Destek

Sorun yaşarsanız:

1. Console loglarını kontrol edin
2. `.env` dosyasını kontrol edin
3. AWS Console'da bucket ve IAM user ayarlarını kontrol edin
4. Access keys'lerin geçerli olduğundan emin olun
