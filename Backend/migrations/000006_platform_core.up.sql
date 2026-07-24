-- Mahsulot TZ maydonlari
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS moq INTEGER NOT NULL DEFAULT 1 CHECK (moq >= 1),
    ADD COLUMN IF NOT EXISTS payment_term TEXT NOT NULL DEFAULT 'prepay_100'
        CHECK (payment_term IN ('prepay_100', 'deferred', 'pod_zakaz_50_50')),
    ADD COLUMN IF NOT EXISTS payment_days INTEGER NOT NULL DEFAULT 0
        CHECK (payment_days >= 0 AND payment_days <= 30),
    ADD COLUMN IF NOT EXISTS specs JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Ishlab chiqaruvchi rekvizit / lokatsiya
ALTER TABLE ishlabchiqaruvchilar
    ADD COLUMN IF NOT EXISTS stir TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS bank_account TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS bank_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS kurator_id BIGINT REFERENCES admins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ishlabchiqaruvchilar_kurator_id ON ishlabchiqaruvchilar(kurator_id);

-- Xaridorlar (foydalanuvchi kabineti)
CREATE TABLE IF NOT EXISTS xaridorlar (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    shop_name     TEXT        NOT NULL,
    first_name    TEXT        NOT NULL,
    last_name     TEXT        NOT NULL,
    phone         TEXT        NOT NULL,
    username      TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    stir          TEXT        NOT NULL DEFAULT '',
    bank_account  TEXT        NOT NULL DEFAULT '',
    bank_name     TEXT        NOT NULL DEFAULT '',
    address       TEXT        NOT NULL DEFAULT '',
    lat           DOUBLE PRECISION,
    lng           DOUBLE PRECISION,
    is_blocked    BOOLEAN     NOT NULL DEFAULT FALSE,
    blocked_reason TEXT       NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dostavka kompaniyalari
CREATE TABLE IF NOT EXISTS dostavka_kompaniyalari (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_name  TEXT        NOT NULL,
    first_name    TEXT        NOT NULL,
    last_name     TEXT        NOT NULL,
    phone         TEXT        NOT NULL,
    username      TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platforma sozlamalari
CREATE TABLE IF NOT EXISTS platform_settings (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    commission_percent  NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    free_promo_active   BOOLEAN       NOT NULL DEFAULT FALSE,
    reserve_balance     NUMERIC(15, 2) NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (commission_percent, free_promo_active, reserve_balance)
SELECT 5.00, FALSE, 0
WHERE NOT EXISTS (SELECT 1 FROM platform_settings);

-- Buyurtmalar
CREATE TABLE IF NOT EXISTS buyurtmalar (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    number                  TEXT           NOT NULL UNIQUE,
    xaridor_id              BIGINT         NOT NULL REFERENCES xaridorlar(id),
    ishlabchiqaruvchi_id    BIGINT         NOT NULL REFERENCES ishlabchiqaruvchilar(id),
    dostavka_id             BIGINT         REFERENCES dostavka_kompaniyalari(id) ON DELETE SET NULL,
    kurator_id              BIGINT         REFERENCES admins(id) ON DELETE SET NULL,
    status                  TEXT           NOT NULL DEFAULT 'yangi'
        CHECK (status IN (
            'yangi',
            'qabul_qilindi',
            'logistikaga_uzatildi',
            'yolda',
            'yetkazildi_tolov_kutilmoqda',
            'yakunlandi',
            'fors_major',
            'kafolat_bilan_yopildi'
        )),
    payment_term            TEXT           NOT NULL
        CHECK (payment_term IN ('prepay_100', 'deferred', 'pod_zakaz_50_50')),
    payment_days            INTEGER        NOT NULL DEFAULT 0,
    total_amount            NUMERIC(15, 2) NOT NULL CHECK (total_amount >= 0),
    point_a_address         TEXT           NOT NULL DEFAULT '',
    point_a_lat             DOUBLE PRECISION,
    point_a_lng             DOUBLE PRECISION,
    point_b_address         TEXT           NOT NULL DEFAULT '',
    point_b_lat             DOUBLE PRECISION,
    point_b_lng             DOUBLE PRECISION,
    contract_html           TEXT           NOT NULL DEFAULT '',
    invoice_html            TEXT           NOT NULL DEFAULT '',
    invoice_number          TEXT           NOT NULL DEFAULT '',
    payment_receipt_url     TEXT           NOT NULL DEFAULT '',
    payment_deadline_at     TIMESTAMPTZ,
    accepted_at             TIMESTAMPTZ,
    ready_at                TIMESTAMPTZ,
    picked_up_at            TIMESTAMPTZ,
    shipped_at              TIMESTAMPTZ,
    delivered_at            TIMESTAMPTZ,
    buyer_received_at       TIMESTAMPTZ,
    paid_at                 TIMESTAMPTZ,
    force_majeure_at        TIMESTAMPTZ,
    force_majeure_by        BIGINT         REFERENCES admins(id) ON DELETE SET NULL,
    guarantee_paid_at       TIMESTAMPTZ,
    guarantee_by            BIGINT         REFERENCES admins(id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyurtmalar_xaridor_id ON buyurtmalar(xaridor_id);
CREATE INDEX IF NOT EXISTS idx_buyurtmalar_ishlabchiqaruvchi_id ON buyurtmalar(ishlabchiqaruvchi_id);
CREATE INDEX IF NOT EXISTS idx_buyurtmalar_dostavka_id ON buyurtmalar(dostavka_id);
CREATE INDEX IF NOT EXISTS idx_buyurtmalar_kurator_id ON buyurtmalar(kurator_id);
CREATE INDEX IF NOT EXISTS idx_buyurtmalar_status ON buyurtmalar(status);

CREATE TABLE IF NOT EXISTS buyurtma_mahsulotlari (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    buyurtma_id   BIGINT         NOT NULL REFERENCES buyurtmalar(id) ON DELETE CASCADE,
    product_id    BIGINT         NOT NULL REFERENCES products(id),
    product_code  TEXT           NOT NULL,
    product_name  TEXT           NOT NULL,
    unit_price    NUMERIC(15, 2) NOT NULL,
    quantity      INTEGER        NOT NULL CHECK (quantity > 0),
    moq           INTEGER        NOT NULL DEFAULT 1,
    line_total    NUMERIC(15, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_buyurtma_mahsulotlari_buyurtma_id ON buyurtma_mahsulotlari(buyurtma_id);

-- 5% komissiya (integratsiyasiz lokal hisob)
CREATE TABLE IF NOT EXISTS komissiyalar (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    buyurtma_id          BIGINT         NOT NULL UNIQUE REFERENCES buyurtmalar(id) ON DELETE CASCADE,
    ishlabchiqaruvchi_id BIGINT         NOT NULL REFERENCES ishlabchiqaruvchilar(id),
    order_amount         NUMERIC(15, 2) NOT NULL,
    percent              NUMERIC(5, 2)  NOT NULL,
    amount               NUMERIC(15, 2) NOT NULL,
    status               TEXT           NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'waived')),
    invoice_html         TEXT           NOT NULL DEFAULT '',
    payment_receipt_url  TEXT           NOT NULL DEFAULT '',
    paid_at              TIMESTAMPTZ,
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_komissiyalar_ishlabchiqaruvchi_id ON komissiyalar(ishlabchiqaruvchi_id);
CREATE INDEX IF NOT EXISTS idx_komissiyalar_status ON komissiyalar(status);

-- Sayt ichidagi bildirishnomalar
CREATE TABLE IF NOT EXISTS notifications (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipient_type TEXT        NOT NULL
        CHECK (recipient_type IN ('admin', 'ishlabchiqaruvchi', 'xaridor', 'dostavka')),
    recipient_id  BIGINT       NOT NULL,
    title         TEXT         NOT NULL,
    body          TEXT         NOT NULL,
    link          TEXT         NOT NULL DEFAULT '',
    is_read       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
    ON notifications(recipient_type, recipient_id, is_read);
