-- Reminders: push subscriptions + per-user timezone/email so the scheduled
-- sender knows where and when to nudge each user.

-- Web Push subscriptions (one row per browser/device the user enabled push on).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_push_subs" ON push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_push_subs" ON push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_push_subs" ON push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Extend user_settings with what the sender needs.
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS email_reminders BOOLEAN DEFAULT FALSE;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS reminder_email TEXT;
