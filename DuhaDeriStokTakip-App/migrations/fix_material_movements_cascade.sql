-- Migration: Add CASCADE delete to material_movements foreign key
-- Bu migration material_movements tablosundaki foreign key constraint'i
-- CASCADE delete ile güncelleyerek malzeme silindiğinde hareketlerinin de silinmesini sağlar

-- Önce mevcut constraint'i kaldır
ALTER TABLE material_movements 
DROP CONSTRAINT IF EXISTS material_movements_material_id_fkey;

-- Yeni constraint'i CASCADE ile ekle
ALTER TABLE material_movements 
ADD CONSTRAINT material_movements_material_id_fkey 
FOREIGN KEY (material_id) 
REFERENCES materials(id) 
ON DELETE CASCADE;

-- Başarılı mesajı
SELECT 'Migration completed: material_movements foreign key updated with CASCADE delete' as message;
