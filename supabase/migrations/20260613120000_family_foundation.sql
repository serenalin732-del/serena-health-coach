-- Family foundation:
--  * sleep quality (deep / REM hours, bedtime) so the coach can judge sleep
--    quality and bedtime consistency, not just duration — important for goals
--    like focus and energy.
--  * a free-text health context (medications / conditions) per user that the
--    coach takes into account (without giving medical advice).
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS deep_hours NUMERIC;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS rem_hours NUMERIC;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS bedtime TEXT;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS health_context TEXT;
