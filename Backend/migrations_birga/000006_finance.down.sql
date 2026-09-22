ALTER TABLE settings
    DROP COLUMN IF EXISTS courier_fee_mode,
    DROP COLUMN IF EXISTS courier_fee_percent,
    DROP COLUMN IF EXISTS courier_fee_fixed,
    DROP COLUMN IF EXISTS kurator_fee_mode,
    DROP COLUMN IF EXISTS kurator_fee_percent,
    DROP COLUMN IF EXISTS kurator_fee_fixed;

DROP TABLE IF EXISTS finance_accruals;
