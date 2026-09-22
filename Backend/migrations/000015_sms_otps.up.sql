CREATE TABLE sms_otps (
    id            BIGSERIAL PRIMARY KEY,
    challenge_id  UUID        NOT NULL UNIQUE,
    phone         TEXT        NOT NULL,
    purpose       TEXT        NOT NULL,
    subject_type  TEXT        NOT NULL,
    code_hash     TEXT        NOT NULL,
    payload       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    attempts      INT         NOT NULL DEFAULT 0,
    max_attempts  INT         NOT NULL DEFAULT 5,
    expires_at    TIMESTAMPTZ NOT NULL,
    consumed_at   TIMESTAMPTZ,
    last_sent_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_otps_lookup
    ON sms_otps (phone, purpose, subject_type, consumed_at);
