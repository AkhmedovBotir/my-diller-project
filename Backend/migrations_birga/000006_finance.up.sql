ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS courier_fee_mode    TEXT         NOT NULL DEFAULT 'percent'
        CHECK (courier_fee_mode IN ('percent', 'fixed')),
    ADD COLUMN IF NOT EXISTS courier_fee_percent NUMERIC(6,2) NOT NULL DEFAULT 0
        CHECK (courier_fee_percent >= 0 AND courier_fee_percent <= 100),
    ADD COLUMN IF NOT EXISTS courier_fee_fixed   BIGINT       NOT NULL DEFAULT 0
        CHECK (courier_fee_fixed >= 0),
    ADD COLUMN IF NOT EXISTS kurator_fee_mode    TEXT         NOT NULL DEFAULT 'percent'
        CHECK (kurator_fee_mode IN ('percent', 'fixed')),
    ADD COLUMN IF NOT EXISTS kurator_fee_percent NUMERIC(6,2) NOT NULL DEFAULT 0
        CHECK (kurator_fee_percent >= 0 AND kurator_fee_percent <= 100),
    ADD COLUMN IF NOT EXISTS kurator_fee_fixed   BIGINT       NOT NULL DEFAULT 0
        CHECK (kurator_fee_fixed >= 0);

CREATE TABLE IF NOT EXISTS finance_accruals (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id        BIGINT      NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    order_amount    BIGINT      NOT NULL CHECK (order_amount >= 0),
    courier_id      BIGINT,
    courier_amount  BIGINT      NOT NULL DEFAULT 0 CHECK (courier_amount >= 0),
    courier_paid    BOOLEAN     NOT NULL DEFAULT false,
    courier_paid_at TIMESTAMPTZ,
    kurator_amount  BIGINT      NOT NULL DEFAULT 0 CHECK (kurator_amount >= 0),
    kurator_paid    BOOLEAN     NOT NULL DEFAULT false,
    kurator_paid_at TIMESTAMPTZ,
    region_name     TEXT        NOT NULL DEFAULT '',
    city_name       TEXT        NOT NULL DEFAULT '',
    mfy_name        TEXT        NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_accruals_courier
    ON finance_accruals (courier_id, courier_paid);
CREATE INDEX IF NOT EXISTS idx_finance_accruals_kurator_paid
    ON finance_accruals (kurator_paid, region_name);
