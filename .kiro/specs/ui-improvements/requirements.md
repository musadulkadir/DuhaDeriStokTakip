# Gereksinimler Belgesi

## Giriş

Bu özellik, uygulamanın kullanıcı arayüzünü iyileştirmek ve para birimi yönetimini standartlaştırmak için geliştirilecektir.

## Sözlük

- **Dropdown**: Açılır menü bileşeni
- **Para Birimi**: TL, USD, EUR gibi para birimleri
- **UI**: Kullanıcı Arayüzü (User Interface)
- **FormControl**: Material-UI form kontrol bileşeni

## Gereksinimler

### Gereksinim 1

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, dropdown menülerin daha büyük ve okunabilir olmasını istiyorum, böylece daha kolay seçim yapabilirim.

#### Kabul Kriterleri

1. TÜM dropdown bileşenler BÜYÜK boyutta görüntülenecek
2. Dropdown'ların minimum yüksekliği 56px olacak
3. Dropdown'lar responsive tasarımda uyumlu çalışacak
4. Tüm sayfalardaki dropdown'lar tutarlı boyutta olacak

### Gereksinim 2

**Kullanıcı Hikayesi:** Bir işveren olarak, çalışan ödemesi yaparken para birimini seçebilmek istiyorum, böylece farklı para birimlerinde ödeme yapabilirim.

#### Kabul Kriterleri

1. Çalışan ödeme formunda para birimi dropdown'ı bulunacak
2. Para birimi seçenekleri TL, USD, EUR olacak
3. Varsayılan para birimi TL olacak
4. Seçilen para birimi ödeme kaydında saklanacak

### Gereksinim 3

**Kullanıcı Hikayesi:** Bir satış temsilcisi olarak, satış yaparken para birimini seçebilmek istiyorum, böylece farklı para birimlerinde satış yapabilirim.

#### Kabul Kriterleri

1. Satış formunda para birimi dropdown'ı bulunacak
2. Para birimi seçenekleri TL, USD, EUR olacak
3. Varsayılan para birimi USD olacak
4. Seçilen para birimi satış kaydında saklanacak

### Gereksinim 4

**Kullanıcı Hikayesi:** Bir muhasebeci olarak, kasa işlemi eklerken para birimini seçebilmek istiyorum, böylece farklı para birimlerinde işlem kaydedebilirim.

#### Kabul Kriterleri

1. Kasa işlemi formunda para birimi dropdown'ı bulunacak
2. Para birimi seçenekleri TL, USD, EUR olacak
3. Varsayılan para birimi USD olacak
4. Seçilen para birimi kasa işlemi kaydında saklanacak