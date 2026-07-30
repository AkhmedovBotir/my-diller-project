-- Hududlar katalogi (viloyat → tuman → MFY)
CREATE TABLE IF NOT EXISTS regions (
    id         BIGSERIAL PRIMARY KEY,
    mongo_oid  TEXT UNIQUE,
    parent_id  BIGINT REFERENCES regions(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    code       TEXT NOT NULL DEFAULT '',
    type       TEXT NOT NULL CHECK (type IN ('region', 'district', 'mfy')),
    status     TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regions_type_parent ON regions(type, parent_id);
CREATE INDEX IF NOT EXISTS idx_regions_parent ON regions(parent_id);
CREATE INDEX IF NOT EXISTS idx_regions_name_lower ON regions(lower(name));

-- Kurator bir nechta MFY boshqaradi; har bir MFY da bitta kurator
CREATE TABLE IF NOT EXISTS kurator_mfy (
    kurator_id BIGINT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    mfy_id     BIGINT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (kurator_id, mfy_id),
    UNIQUE (mfy_id)
);

CREATE INDEX IF NOT EXISTS idx_kurator_mfy_kurator ON kurator_mfy(kurator_id);

ALTER TABLE xaridorlar
    ADD COLUMN IF NOT EXISTS mfy_id BIGINT REFERENCES regions(id) ON DELETE SET NULL;

ALTER TABLE ishlabchiqaruvchilar
    ADD COLUMN IF NOT EXISTS mfy_id BIGINT REFERENCES regions(id) ON DELETE SET NULL;

ALTER TABLE dostavka_kompaniyalari
    ADD COLUMN IF NOT EXISTS mfy_id BIGINT REFERENCES regions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS mfy TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS kurator_id BIGINT REFERENCES admins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_xaridorlar_mfy_id ON xaridorlar(mfy_id);
CREATE INDEX IF NOT EXISTS idx_ishlabchiqaruvchilar_mfy_id ON ishlabchiqaruvchilar(mfy_id);
CREATE INDEX IF NOT EXISTS idx_dostavka_mfy_id ON dostavka_kompaniyalari(mfy_id);
CREATE INDEX IF NOT EXISTS idx_dostavka_kurator_id ON dostavka_kompaniyalari(kurator_id);
