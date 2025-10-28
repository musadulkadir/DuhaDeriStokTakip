-- Add brand column to purchase_items table
ALTER TABLE purchase_items 
ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

-- Add comment
COMMENT ON COLUMN purchase_items.brand IS 'Malzeme firması (materials tablosundan)';
