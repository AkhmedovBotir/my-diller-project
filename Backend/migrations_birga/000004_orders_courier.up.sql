-- Buyurtmaga kuryer biriktirish
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS courier_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_bx_orders_courier
    ON orders (courier_id)
    WHERE courier_id IS NOT NULL;
