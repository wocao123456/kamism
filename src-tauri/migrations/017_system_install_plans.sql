-- Runtime system configuration and merchant subscription extensions.
CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(96) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_config (key, value) VALUES
    ('install.completed', 'false'::jsonb),
    ('merchant.enabled_features', '["dashboard","apps","cards","activations","messages","blacklist","agents","api_docs","api_manage"]'::jsonb),
    ('mail.smtp', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE plan_configs DROP CONSTRAINT IF EXISTS plan_configs_plan_check;
ALTER TABLE plan_configs ALTER COLUMN plan TYPE VARCHAR(64);
ALTER TABLE plan_configs ALTER COLUMN label TYPE VARCHAR(64);
ALTER TABLE plan_configs ADD COLUMN IF NOT EXISTS description VARCHAR(255) DEFAULT '';
ALTER TABLE plan_configs ADD COLUMN IF NOT EXISTS price_month NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE plan_configs ADD COLUMN IF NOT EXISTS price_quarter NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE plan_configs ADD COLUMN IF NOT EXISTS price_year NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE plan_configs ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 100;
ALTER TABLE plan_configs ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE plan_configs SET sort_order = 1 WHERE plan = 'free';
UPDATE plan_configs SET sort_order = 10, price_month = 29, price_quarter = 79, price_year = 299 WHERE plan = 'pro';

CREATE TABLE IF NOT EXISTS recharge_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(96) NOT NULL UNIQUE,
    plan VARCHAR(64) NOT NULL,
    billing_cycle VARCHAR(16) NOT NULL CHECK (billing_cycle IN ('month','quarter','year','custom')),
    duration_days INTEGER NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'unused' CHECK (status IN ('unused','used','disabled')),
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_recharge_codes_status ON recharge_codes(status);
CREATE INDEX IF NOT EXISTS idx_recharge_codes_merchant ON recharge_codes(merchant_id);

CREATE TABLE IF NOT EXISTS system_versions (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version_text VARCHAR(128) NOT NULL DEFAULT 'local',
    commit_hash VARCHAR(64) NOT NULL DEFAULT 'local',
    commit_message TEXT NOT NULL DEFAULT 'local install version',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO system_versions (id, version_text, commit_hash, commit_message)
VALUES (1, 'local version', 'local', 'local install version')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE merchants DROP CONSTRAINT IF EXISTS merchants_plan_check;
ALTER TABLE merchants ALTER COLUMN plan TYPE VARCHAR(64);

-- Existing deployments already have an admin account; mark them installed to avoid reopening the first-install wizard as a backdoor.
UPDATE system_config
SET value = 'true'::jsonb, updated_at = NOW()
WHERE key = 'install.completed'
  AND EXISTS (SELECT 1 FROM admins);
