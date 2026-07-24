DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS komissiyalar;
DROP TABLE IF EXISTS buyurtma_mahsulotlari;
DROP TABLE IF EXISTS buyurtmalar;
DROP TABLE IF EXISTS platform_settings;
DROP TABLE IF EXISTS dostavka_kompaniyalari;
DROP TABLE IF EXISTS xaridorlar;

ALTER TABLE ishlabchiqaruvchilar
    DROP COLUMN IF EXISTS stir,
    DROP COLUMN IF EXISTS bank_account,
    DROP COLUMN IF EXISTS bank_name,
    DROP COLUMN IF EXISTS address,
    DROP COLUMN IF EXISTS lat,
    DROP COLUMN IF EXISTS lng,
    DROP COLUMN IF EXISTS kurator_id;

ALTER TABLE products
    DROP COLUMN IF EXISTS moq,
    DROP COLUMN IF EXISTS payment_term,
    DROP COLUMN IF EXISTS payment_days,
    DROP COLUMN IF EXISTS specs;
