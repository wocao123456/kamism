ALTER TABLE recharge_codes DROP CONSTRAINT IF EXISTS recharge_codes_billing_cycle_check;
ALTER TABLE recharge_codes ADD CONSTRAINT recharge_codes_billing_cycle_check CHECK (billing_cycle IN ('day','week','month','quarter','year','custom'));
