ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS support_telegram TEXT NOT NULL DEFAULT 'workmydiler';
