-- Soft-delete: o'chirilgan mahsulotlar buyurtma tarixi uchun saqlanadi,
-- lekin katalog/ro'yxatdan chiqariladi. Faol mahsulotlar uchun code unique.

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS products_code_active_uq
    ON products (code)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_not_deleted
    ON products (id)
    WHERE deleted_at IS NULL;
