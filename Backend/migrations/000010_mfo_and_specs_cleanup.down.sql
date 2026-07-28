UPDATE products
SET specs = COALESCE(specs, '{}'::jsonb),
    updated_at = now();

ALTER TABLE xaridorlar DROP COLUMN IF EXISTS mfo;
ALTER TABLE ishlabchiqaruvchilar DROP COLUMN IF EXISTS mfo;
