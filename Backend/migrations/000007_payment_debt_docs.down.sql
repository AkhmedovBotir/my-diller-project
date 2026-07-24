DROP TABLE IF EXISTS platform_debts;

ALTER TABLE buyurtmalar
  DROP COLUMN IF EXISTS payment_phase,
  DROP COLUMN IF EXISTS advance_amount,
  DROP COLUMN IF EXISTS advance_receipt_url,
  DROP COLUMN IF EXISTS advance_confirmed_at,
  DROP COLUMN IF EXISTS deadline_warned_at;
