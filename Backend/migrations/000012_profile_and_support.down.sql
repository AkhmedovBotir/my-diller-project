ALTER TABLE ishlabchiqaruvchilar
    DROP COLUMN IF EXISTS birth_date,
    DROP COLUMN IF EXISTS mfy,
    DROP COLUMN IF EXISTS city;

DROP INDEX IF EXISTS idx_xaridorlar_kurator_id;
ALTER TABLE xaridorlar
    DROP COLUMN IF EXISTS kurator_id,
    DROP COLUMN IF EXISTS birth_date,
    DROP COLUMN IF EXISTS mfy,
    DROP COLUMN IF EXISTS city;

DROP INDEX IF EXISTS idx_admins_kurator_geo;
ALTER TABLE admins
    DROP COLUMN IF EXISTS residence_address,
    DROP COLUMN IF EXISTS birth_date,
    DROP COLUMN IF EXISTS mfy,
    DROP COLUMN IF EXISTS city;
