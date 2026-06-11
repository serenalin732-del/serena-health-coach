-- Goals: what the user is aiming for, used by the AI coach to anchor advice.
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS target_waist_cm NUMERIC;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS goal_focus TEXT;
