CREATE TABLE IF NOT EXISTS ishlabchiqaruvchilar (
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
