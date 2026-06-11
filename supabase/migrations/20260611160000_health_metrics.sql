-- Extra body metrics auto-synced from Apple Health (via the iOS Shortcut):
-- lean body mass, resting heart rate, and heart-rate variability. Weight,
-- body fat %, and steps already exist on daily_logs.
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS lean_mass_kg NUMERIC;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS resting_hr INTEGER;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS hrv_ms NUMERIC;
