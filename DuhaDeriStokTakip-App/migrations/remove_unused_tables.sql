-- Kullanılmayan tabloları ve kolonları kaldır

-- 1. Returns tablosu - Hiç kullanılmıyor
DROP TABLE IF EXISTS returns CASCADE;

-- 2. Materials tablosundan color_shade kolonu - Hiç kullanılmıyor
ALTER TABLE materials DROP COLUMN IF EXISTS color_shade;

-- NOT: balance_eur ve balance_usd kolonları KALDIRILMADI
-- Çünkü backend'de aktif olarak kullanılıyorlar
