CREATE TABLE IF NOT EXISTS settings (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    min_order_amount  BIGINT      NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO settings (min_order_amount)
SELECT 0
WHERE NOT EXISTS (SELECT 1 FROM settings);
