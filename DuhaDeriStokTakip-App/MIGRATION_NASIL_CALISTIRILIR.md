# Migration Nasıl Çalıştırılır

## Sorun
Malzemeler silinemiyor, şu hata alınıyor:
```
update or delete on table "materials" violates foreign key constraint 
"material_movements_material_id_fkey" on table "material_movements"
```

## Çözüm
Migration scripti ile foreign key constraint'e CASCADE eklenmeli.

## Adım 1: Batch Script ile (ÖNERİLEN)

1. Proje klasöründe `run-migration-cascade.bat` dosyasına **çift tıkla**
2. Script otomatik olarak migration'ı çalıştıracak
3. "BASARILI!" mesajını gördüğünde tamam

## Adım 2: Manuel Çalıştırma (Eğer batch script çalışmazsa)

### Windows Command Prompt'ta:

```cmd
cd DuhaDeriStokTakip-App
psql -h localhost -p 5432 -U postgres -d duha_deri_db -f migrations/fix_material_movements_cascade.sql
```

Şifre sorduğunda PostgreSQL şifreni gir (boşsa Enter'a bas).

### Alternatif: pgAdmin ile

1. pgAdmin'i aç
2. `duha_deri_db` veritabanına bağlan
3. Tools > Query Tool
4. `migrations/fix_material_movements_cascade.sql` dosyasını aç
5. Execute (F5) tuşuna bas

## Kontrol

Migration başarılı olduysa, artık malzemeleri silebilirsin. Hata almayacaksın.

## Sorun Devam Ederse

Eğer hala sorun varsa, uygulamayı yeniden başlat:
1. Uygulamayı kapat
2. Uygulamayı tekrar aç
3. Malzeme silmeyi dene
