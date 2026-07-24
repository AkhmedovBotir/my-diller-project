ALTER TABLE buyurtmalar
  ADD COLUMN IF NOT EXISTS payment_phase TEXT NOT NULL DEFAULT 'none'
    CHECK (payment_phase IN ('none','awaiting_advance','advance_done','awaiting_final','paid')),
  ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_receipt_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS advance_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deadline_warned_at TIMESTAMPTZ;

-- Mavjud qatorlar uchun standart qiymatlar yetarli (status/term bo'yicha qayta
-- hisoblash talab qilinmaydi, chunki eski buyurtmalar allaqachon yakunlangan
-- yoki jarayonda va payment_phase='none' ularga ta'sir qilmaydi).

CREATE TABLE IF NOT EXISTS platform_debts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  xaridor_id BIGINT NOT NULL REFERENCES xaridorlar(id),
  buyurtma_id BIGINT NOT NULL UNIQUE REFERENCES buyurtmalar(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','collected','written_off')),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_platform_debts_status ON platform_debts(status);
CREATE INDEX IF NOT EXISTS idx_platform_debts_xaridor ON platform_debts(xaridor_id);
