-- Store the portion weight (grams) per meal so calories/macros can be scaled
-- precisely and re-edited later.
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS grams NUMERIC;
