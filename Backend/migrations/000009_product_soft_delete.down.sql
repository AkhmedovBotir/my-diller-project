DROP INDEX IF EXISTS idx_products_not_deleted;
DROP INDEX IF EXISTS products_code_active_uq;

-- Unique qaytariladi (soft-delete yo'qoladi — conflict bo'lishi mumkin)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_code_key'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_code_key UNIQUE (code);
    END IF;
END $$;

ALTER TABLE products DROP COLUMN IF EXISTS deleted_at;
