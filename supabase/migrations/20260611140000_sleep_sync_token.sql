-- Personal sync token: lets an iOS Shortcut (reading Garmin/Apple Health sleep)
-- post last night's sleep without an interactive login.
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS sync_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS user_settings_sync_token_idx
  ON user_settings (sync_token) WHERE sync_token IS NOT NULL;
