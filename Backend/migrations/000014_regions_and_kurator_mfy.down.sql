ALTER TABLE dostavka_kompaniyalari
    DROP COLUMN IF EXISTS kurator_id,
    DROP COLUMN IF EXISTS mfy,
    DROP COLUMN IF EXISTS city,
    DROP COLUMN IF EXISTS mfy_id;

ALTER TABLE ishlabchiqaruvchilar DROP COLUMN IF EXISTS mfy_id;
ALTER TABLE xaridorlar DROP COLUMN IF EXISTS mfy_id;

DROP TABLE IF EXISTS kurator_mfy;
DROP TABLE IF EXISTS regions;
