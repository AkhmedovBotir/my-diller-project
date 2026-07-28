DROP TABLE IF EXISTS kurator_tolov_sorovlari;
DROP TABLE IF EXISTS kurator_daromadlar;

ALTER TABLE platform_settings DROP COLUMN IF EXISTS curator_percent;

ALTER TABLE komissiyalar DROP CONSTRAINT IF EXISTS komissiyalar_status_check;
ALTER TABLE komissiyalar ADD CONSTRAINT komissiyalar_status_check CHECK (
    status IN ('pending', 'paid', 'waived')
);

ALTER TABLE buyurtmalar DROP CONSTRAINT IF EXISTS buyurtmalar_status_check;
ALTER TABLE buyurtmalar ADD CONSTRAINT buyurtmalar_status_check CHECK (status IN (
    'yangi',
    'qabul_qilindi',
    'logistikaga_uzatildi',
    'yolda',
    'yetkazildi_tolov_kutilmoqda',
    'yakunlandi',
    'fors_major',
    'kafolat_bilan_yopildi'
));

ALTER TABLE buyurtmalar DROP COLUMN IF EXISTS invoice_agreed_at;

DROP TABLE IF EXISTS shartnomalar;

ALTER TABLE products DROP COLUMN IF EXISTS city;
