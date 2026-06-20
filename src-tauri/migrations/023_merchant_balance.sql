-- 商户余额字段与流水表
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS balance NUMERIC(14,4) DEFAULT 0;

CREATE TABLE IF NOT EXISTS balance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
    amount NUMERIC(14,4) NOT NULL DEFAULT 0,
    balance_after NUMERIC(14,4) NOT NULL DEFAULT 0,
    record_type VARCHAR(64) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
