-- Profil to'ldirish maydonlari (shahar, MFY, tug'ilgan sana, yashash manzili)
ALTER TABLE admins
    ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS mfy TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS residence_address TEXT NOT NULL DEFAULT '';

ALTER TABLE xaridorlar
    ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS mfy TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS kurator_id BIGINT REFERENCES admins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_xaridorlar_kurator_id ON xaridorlar(kurator_id);

ALTER TABLE ishlabchiqaruvchilar
    ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS mfy TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS birth_date DATE;

CREATE INDEX IF NOT EXISTS idx_admins_kurator_geo ON admins(type, city, mfy);
