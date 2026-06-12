-- Active energy (calories burned from movement/workouts) synced from Apple
-- Health via the iOS Shortcut, so the coach and dashboard can show daily burn.
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS active_kcal INTEGER;
