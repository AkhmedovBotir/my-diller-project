-- Namunaviy users jadvali endi kerak emas
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS admins (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name    TEXT        NOT NULL,
    last_name     TEXT        NOT NULL,
    phone         TEXT        NOT NULL,
    username      TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    type          TEXT        NOT NULL CHECK (type IN ('general', 'admin', 'kurator')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
