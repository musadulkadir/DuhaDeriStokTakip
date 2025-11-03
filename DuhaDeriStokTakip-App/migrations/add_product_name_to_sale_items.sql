-- sale_items tablosuna product_name ve color kolonları ekle
-- Bu kolonlar satış detaylarında ürün adı ve renk bilgisini saklamak için gerekli

ALTER TABLE sale_items 
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);

ALTER TABLE sale_items 
ADD COLUMN IF NOT EXISTS color VARCHAR(50);

-- Mevcut kayıtlar için product_name'i doldur (eğer varsa)
UPDATE sale_items 
SET product_name = p.name 
FROM products p 
WHERE sale_items.product_id = p.id 
AND sale_items.product_name IS NULL;

-- Mevcut kayıtlar için color'u doldur (eğer varsa)
UPDATE sale_items 
SET color = p.color 
FROM products p 
WHERE sale_items.product_id = p.id 
AND sale_items.color IS NULL;
