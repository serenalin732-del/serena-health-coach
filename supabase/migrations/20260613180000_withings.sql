-- Withings integration: OAuth tokens per user + short-lived state for the
-- connect handshake. Only the edge functions (service role) write these; users
-- may read their own token row to show "connected" status.
CREATE TABLE IF NOT EXISTS withings_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  withings_userid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_withings" ON withings_tokens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS withings_pending (
  state TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE withings_pending ENABLE ROW LEVEL SECURITY;
-- no policies: only the edge functions (service role) touch this table
