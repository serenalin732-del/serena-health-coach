-- 16:8 (or any) intermittent fasting window: a per-user eating window so the
-- app can show live "eating / fasting" status and countdown.
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS fasting_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS eating_window_start TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS eating_window_end TEXT;
