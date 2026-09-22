-- Birga Xarid: kategoriya, mahsulot, yig'im, mijozlar
-- Admin/kuryer My Diller asosiy bazasida qoladi.

CREATE TABLE IF NOT EXISTS categories (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT        NOT NULL UNIQUE,
    description TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subcategories (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id BIGINT      NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_bx_subcategories_category ON subcategories(category_id);

CREATE TABLE IF NOT EXISTS products (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id    BIGINT      NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    subcategory_id BIGINT      REFERENCES subcategories(id) ON DELETE SET NULL,
    name           TEXT        NOT NULL,
    description    TEXT        NOT NULL DEFAULT '',
    unit           TEXT        NOT NULL DEFAULT 'dona',
    price          BIGINT      NOT NULL DEFAULT 0 CHECK (price >= 0),
    stock          INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
    photo_url      TEXT        NOT NULL DEFAULT '',
    is_active      BOOLEAN     NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_bx_products_subcategory ON products(subcategory_id);

CREATE TABLE IF NOT EXISTS group_buys (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind           TEXT        NOT NULL DEFAULT 'product'
        CHECK (kind IN ('product', 'combo')),
    title          TEXT        NOT NULL,
    description    TEXT        NOT NULL DEFAULT '',
    product_id     BIGINT      REFERENCES products(id) ON DELETE SET NULL,
    price          BIGINT      NOT NULL DEFAULT 0 CHECK (price >= 0),
    min_volume     INTEGER     NOT NULL DEFAULT 1 CHECK (min_volume >= 1),
    current_volume INTEGER     NOT NULL DEFAULT 0 CHECK (current_volume >= 0),
    stock          INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
    photo_urls     TEXT[]      NOT NULL DEFAULT '{}',
    status         TEXT        NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed', 'in_fulfillment', 'completed', 'cancelled')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bx_group_buys_status ON group_buys(status);
CREATE INDEX IF NOT EXISTS idx_bx_group_buys_product ON group_buys(product_id);

CREATE TABLE IF NOT EXISTS group_buy_items (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_buy_id BIGINT  NOT NULL REFERENCES group_buys(id) ON DELETE CASCADE,
    product_id   BIGINT  NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    UNIQUE (group_buy_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_bx_group_buy_items_gb ON group_buy_items(group_buy_id);

CREATE TABLE IF NOT EXISTS customers (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone             TEXT        NOT NULL UNIQUE,
    first_name        TEXT        NOT NULL DEFAULT '',
    last_name         TEXT        NOT NULL DEFAULT '',
    region_name       TEXT        NOT NULL DEFAULT '',
    city_name         TEXT        NOT NULL DEFAULT '',
    mfy_name          TEXT        NOT NULL DEFAULT '',
    address           TEXT        NOT NULL DEFAULT '',
    lat               DOUBLE PRECISION,
    lng               DOUBLE PRECISION,
    profile_completed BOOLEAN     NOT NULL DEFAULT false,
    is_blocked        BOOLEAN     NOT NULL DEFAULT false,
    blocked_reason    TEXT        NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_bx_customers_created ON customers(created_at DESC);
