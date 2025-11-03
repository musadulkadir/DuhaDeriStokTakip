-- material_movements tablosuna eksik kolonları ekle
ALTER TABLE material_movements 
ADD COLUMN IF NOT EXISTS reference_id INTEGER;

ALTER TABLE material_movements 
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'TRY';
