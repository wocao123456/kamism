-- 公告余额奖励
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reward_amount DOUBLE PRECISION DEFAULT 0;
ALTER TABLE message_reads ADD COLUMN IF NOT EXISTS reward_claimed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_message_reads_reward_claimed ON message_reads(message_id, merchant_id) WHERE reward_claimed_at IS NOT NULL;
