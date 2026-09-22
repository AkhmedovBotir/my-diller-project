-- Mijoz profili: tug'ilgan sana
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Savat
CREATE TABLE IF NOT EXISTS cart_items (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id  BIGINT      NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    group_buy_id BIGINT      NOT NULL REFERENCES group_buys(id) ON DELETE CASCADE,
    quantity     INTEGER     NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (customer_id, group_buy_id)
);

CREATE INDEX IF NOT EXISTS idx_bx_cart_customer ON cart_items(customer_id);

-- Buyurtmalar
CREATE TABLE IF NOT EXISTS orders (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id     BIGINT      NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    group_buy_id    BIGINT      NOT NULL REFERENCES group_buys(id) ON DELETE RESTRICT,
    quantity        INTEGER     NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    unit_price      BIGINT      NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    total_amount    BIGINT      NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status          TEXT        NOT NULL DEFAULT 'collecting'
        CHECK (status IN (
            'collecting',
            'awaiting_courier',
            'with_courier',
            'issued',
            'cancelled'
        )),
    pickup_code     TEXT        NOT NULL DEFAULT '',
    title_snapshot  TEXT        NOT NULL DEFAULT '',
    photo_snapshot  TEXT        NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_bx_orders_group_buy ON orders(group_buy_id);
CREATE INDEX IF NOT EXISTS idx_bx_orders_status ON orders(status);
