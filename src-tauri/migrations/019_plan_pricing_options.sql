ALTER TABLE plan_configs ADD COLUMN IF NOT EXISTS pricing_options JSONB NOT NULL DEFAULT '[]'::jsonb;
UPDATE plan_configs
SET pricing_options = jsonb_build_array(
  jsonb_build_object('key','month','label','月付','days',30,'price',price_month)
)
WHERE pricing_options = '[]'::jsonb;
