ALTER TABLE admins ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS background_url TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS api_key TEXT;

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS background_url TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS provider_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_provider_key ON merchants(provider_key) WHERE provider_key IS NOT NULL;
