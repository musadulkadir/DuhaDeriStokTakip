# Çek ve Senet Yönetimi Güncellemesi

## Yapılan Değişiklikler

### 1. Sıra Numarası Sistemi
- Her çek ve senet için otomatik sıra numarası oluşturulur
- Format: `C2025-0001` (Çekler için) veya `S2025-0001` (Senetler için)
- Yıl bazlı sıralama yapılır
- Sıra numarası tabloda ve detaylarda görüntülenir

### 2. Durum Yönetimi
Çek ve senetler artık 3 farklı durumda olabilir:

- **Aktif (active)**: Yeni eklenen, henüz kullanılmamış çek/senetler
- **Tahsil Edildi (collected)**: Kasaya bozdurulmuş çek/senetler
- **Kullanıldı (used)**: Tedarikçiye ödeme için verilmiş çek/senetler

### 3. Çevrilmiş Tutar Bilgisi
- Çek farklı bir para birimine çevrildiğinde:
  - Orijinal tutar ve para birimi saklanır
  - Çevrilmiş tutar ve para birimi saklanır
  - Kur bilgisi saklanır
  - Detay ekranında tüm bilgiler görüntülenir

### 4. Tahsil Etme İşlemi
- Gelen çekler "Tahsil Et" butonu ile kasaya bozdurulabilir
- Tahsil edilen çek:
  - Durumu "Tahsil Edildi" olarak işaretlenir
  - Kasaya para girişi yapılır
  - Artık tekrar tahsil edilemez

### 5. Tedarikçiye Ödeme
- Tedarikçiye ödeme yaparken çek/senet kullanılabilir
- Kullanılan çek:
  - Durumu "Kullanıldı" olarak işaretlenir
  - Çek farklı para biriminde kullanılırsa çevrilme bilgileri kaydedilir
  - Artık başka işlemlerde kullanılamaz

## Kurulum

### Otomatik Güncelleme
Migration otomatik olarak çalışır! Uygulamayı başlattığınızda:

1. **Yedek Alın**: Önce mutlaka veritabanınızın yedeğini alın!

2. **Uygulamayı Başlatın**: 
   - Uygulama başlatıldığında migration otomatik çalışacaktır
   - Console'da migration loglarını görebilirsiniz

3. **Kontrol Edin**: 
   - Çek-Senet Kasası sayfasına gidin
   - Mevcut çeklerin sıra numaralarını kontrol edin
   - Durum bilgilerinin doğru olduğunu kontrol edin

### Migration Detayları
Migration sadece gerekli olduğunda çalışır:
- Sıra numarası olmayan kayıtlar varsa
- Yeni kolonlar eklenmemişse
- Durum bilgileri güncellenmemişse

## Kullanım

### Yeni Çek/Senet Ekleme
1. "Yeni İşlem" butonuna tıklayın
2. Formu doldurun
3. Kaydet
4. Sistem otomatik olarak sıra numarası oluşturacaktır

### Çek/Senet Tahsil Etme
1. Listeden bir çek seçin (sadece gelen ve aktif çekler)
2. Detay ekranında "Tahsil Et" butonuna tıklayın
3. Tutarı onaylayın
4. Çek kasaya bozdurulacak ve durumu "Tahsil Edildi" olacaktır

### Tedarikçiye Çek ile Ödeme
1. Tedarikçi detay sayfasına gidin
2. "Ödeme Ekle" butonuna tıklayın
3. Ödeme yöntemi olarak "Çek" veya "Senet" seçin
4. Listeden kullanmak istediğiniz çeki seçin
5. Gerekirse farklı para birimi ve tutar girin (çevrilme)
6. Kaydet
7. Çek durumu "Kullanıldı" olarak işaretlenecektir

## Veritabanı Değişiklikleri

### Yeni Kolonlar
- `sequence_number`: Sıra numarası (VARCHAR(20))
- `status`: Durum (VARCHAR(20), 'active'|'collected'|'used')
- `converted_amount`: Çevrilmiş tutar (DECIMAL(15,2))

### Güncellenen Kolonlar
- `is_converted`: Çevrilme durumu (BOOLEAN)
- `original_currency`: Orijinal para birimi (VARCHAR(3))
- `original_amount`: Orijinal tutar (DECIMAL(15,2))
- `conversion_rate`: Kur oranı (DECIMAL(10,4))

### Yeni Index'ler
- `idx_check_transactions_sequence_number`
- `idx_check_transactions_status`

## Sorun Giderme

### Migration Hatası
Eğer migration sırasında hata alırsanız:
1. PostgreSQL'in çalıştığından emin olun
2. .env dosyasındaki veritabanı bilgilerini kontrol edin
3. Uygulama console'unda hata mesajlarını kontrol edin
4. Gerekirse uygulamayı yeniden başlatın

### Sıra Numaraları Görünmüyor
1. Uygulama console'unda "Migration completed" mesajını kontrol edin
2. Uygulamayı yeniden başlatın
3. Sayfayı yenileyin (F5)
4. Hala görünmüyorsa, veritabanında `sequence_number` kolonunun olduğunu kontrol edin

### Durum Bilgileri Yanlış
Migration mevcut kayıtları şu kurallara göre günceller:
- Description'da "Tahsil" geçiyorsa -> "Tahsil Edildi"
- Description'da "Tedarikçi" veya "Kullanıldı" geçiyorsa -> "Kullanıldı"
- Diğer is_cashed=true kayıtlar -> "Kullanıldı"
- is_cashed=false kayıtlar -> "Aktif"

Eğer yanlış durumlar varsa, manuel olarak düzenleyebilirsiniz.

## Notlar

- Sıra numaraları yıl bazlı sıfırlanır (her yıl 0001'den başlar)
- Tahsil edilmiş veya kullanılmış çekler düzenlenemez
- Çevrilme bilgileri sadece farklı para birimi kullanıldığında kaydedilir
- Tüm işlemler transaction içinde yapılır, hata durumunda geri alınır
