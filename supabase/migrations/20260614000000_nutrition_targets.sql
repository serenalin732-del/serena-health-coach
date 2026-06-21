-- Calorie/macro tracking upgrade:
--  * per-meal good (healthy) fat grams and vegetable servings, estimated by AI
--  * per-user daily targets (calories, protein, carbs, good fat, veg servings)
--    so the Food page can show progress and "remaining" against a plan.
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS healthy_fat_g NUMERIC;
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS veg_servings NUMERIC;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS target_calories INTEGER;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS target_protein_g NUMERIC;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS target_carbs_g NUMERIC;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS target_fat_g NUMERIC;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS target_veg_servings NUMERIC;
