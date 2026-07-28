-- MFO (bank identifikatsiya kodi) — zavod va xaridor rekvizitlari
ALTER TABLE ishlabchiqaruvchilar
    ADD COLUMN IF NOT EXISTS mfo TEXT NOT NULL DEFAULT '';

ALTER TABLE xaridorlar
    ADD COLUMN IF NOT EXISTS mfo TEXT NOT NULL DEFAULT '';

-- Ortig'cha specs kalitlarini olib tashlash (rang, material, qadoq)
UPDATE products
SET specs = (COALESCE(specs, '{}'::jsonb) - 'color' - 'material' - 'pack_qty' - 'rang' - 'qadoq'),
    updated_at = now()
WHERE specs ?| ARRAY['color', 'material', 'pack_qty', 'rang', 'qadoq'];
