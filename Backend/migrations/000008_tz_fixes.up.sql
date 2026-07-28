-- Mahsulot shahri (vitrina / soliq talabi)
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';

-- Ishlab chiqaruvchi: telefon login uchun unique (username = phone registerda)
-- profile_complete hisoblash maydoni emas — service da tekshiriladi

-- Xaridor-zavod bir martalik shartnoma
CREATE TABLE IF NOT EXISTS shartnomalar (
    id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    xaridor_id             BIGINT NOT NULL REFERENCES xaridorlar(id) ON DELETE CASCADE,
    ishlabchiqaruvchi_id   BIGINT NOT NULL REFERENCES ishlabchiqaruvchilar(id) ON DELETE CASCADE,
    contract_html          TEXT NOT NULL DEFAULT '',
    agreed_at              TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (xaridor_id, ishlabchiqaruvchi_id)
);

CREATE INDEX IF NOT EXISTS idx_shartnomalar_xaridor ON shartnomalar(xaridor_id);
CREATE INDEX IF NOT EXISTS idx_shartnomalar_zavod ON shartnomalar(ishlabchiqaruvchi_id);

-- Buyurtma: invoice tasdiq + yangi status uchun CHECK yangilash
ALTER TABLE buyurtmalar
    ADD COLUMN IF NOT EXISTS invoice_agreed_at TIMESTAMPTZ;

-- Eski CHECK ni olib tashlab yangisini qo'yamiz (Postgres)
ALTER TABLE buyurtmalar DROP CONSTRAINT IF EXISTS buyurtmalar_status_check;
ALTER TABLE buyurtmalar ADD CONSTRAINT buyurtmalar_status_check CHECK (status IN (
    'yangi',
    'qabul_qilindi',
    'tayyor_tolov_kutilmoqda',
    'logistikaga_uzatildi',
    'yolda',
    'yetkazildi_tolov_kutilmoqda',
    'yakunlandi',
    'fors_major',
    'kafolat_bilan_yopildi'
));

-- Komissiya: submitted (admin tasdig'ini kutadi)
ALTER TABLE komissiyalar DROP CONSTRAINT IF EXISTS komissiyalar_status_check;
ALTER TABLE komissiyalar ADD CONSTRAINT komissiyalar_status_check CHECK (
    status IN ('pending', 'submitted', 'paid', 'waived')
);

-- Platforma sozlamalari: kurator 2.5%
ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS curator_percent NUMERIC(5, 2) NOT NULL DEFAULT 2.50;

-- Kurator daromadi (har yopilgan buyurtma bo'yicha)
CREATE TABLE IF NOT EXISTS kurator_daromadlar (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kurator_id    BIGINT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    buyurtma_id   BIGINT NOT NULL UNIQUE REFERENCES buyurtmalar(id) ON DELETE CASCADE,
    order_amount  NUMERIC(15, 2) NOT NULL,
    percent       NUMERIC(5, 2) NOT NULL,
    amount        NUMERIC(15, 2) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kurator_daromadlar_kurator ON kurator_daromadlar(kurator_id);

-- Kurator kartaga o'tkazish so'rovlari
CREATE TABLE IF NOT EXISTS kurator_tolov_sorovlari (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kurator_id    BIGINT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    amount        NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    card_number   TEXT NOT NULL DEFAULT '',
    card_holder   TEXT NOT NULL DEFAULT '',
    note          TEXT NOT NULL DEFAULT '',
    status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'rejected')),
    admin_note    TEXT NOT NULL DEFAULT '',
    processed_by  BIGINT REFERENCES admins(id) ON DELETE SET NULL,
    processed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kurator_tolov_sorovlari_kurator ON kurator_tolov_sorovlari(kurator_id);
CREATE INDEX IF NOT EXISTS idx_kurator_tolov_sorovlari_status ON kurator_tolov_sorovlari(status);
