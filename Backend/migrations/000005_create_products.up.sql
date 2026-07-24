CREATE TABLE IF NOT EXISTS products (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code                  TEXT           NOT NULL UNIQUE,
    ishlabchiqaruvchi_id  BIGINT         NOT NULL REFERENCES ishlabchiqaruvchilar(id) ON DELETE CASCADE,
    name                  TEXT           NOT NULL,
    description           JSONB          NOT NULL,
    category_id           BIGINT         NOT NULL REFERENCES categories(id),
    subcategory_id        BIGINT         NOT NULL REFERENCES subcategories(id),
    price                 NUMERIC(15, 2) NOT NULL CHECK (price >= 0),
    quantity              INTEGER        NOT NULL CHECK (quantity >= 0),
    images                TEXT[]         NOT NULL,
    status                TEXT           NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_note        TEXT           NOT NULL DEFAULT '',
    reviewed_by           BIGINT         REFERENCES admins(id) ON DELETE SET NULL,
    reviewed_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT products_images_count_chk CHECK (
        cardinality(images) >= 1 AND cardinality(images) <= 5
    ),
    CONSTRAINT products_code_format_chk CHECK (
        code ~ '^[A-Z0-9]{3}-[A-Z0-9]{3}$'
    )
);

CREATE INDEX IF NOT EXISTS idx_products_ishlabchiqaruvchi_id ON products(ishlabchiqaruvchi_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);
