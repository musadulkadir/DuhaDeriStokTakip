-- Categories ve Colors tablolarını kaldır
-- Artık bunlar koddan geliyor

DROP TABLE IF EXISTS colors CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Not: Bu tablolar artık kullanılmıyor
-- Kategoriler: ProductManagement.tsx içinde sabit olarak tanımlı
-- Renkler: ProductManagement.tsx içinde sabit olarak tanımlı
