-- Personal pantry: products the user has photographed (a packaged food's
-- nutrition label), stored with per-100g values so logging "Nuri sardines 100g"
-- can pull the exact composition they saved before.
CREATE TABLE IF NOT EXISTS pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  calories_100 NUMERIC,
  protein_100 NUMERIC,
  carbs_100 NUMERIC,
  fat_100 NUMERIC,
  healthy_fat_100 NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_pantry" ON pantry_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_pantry" ON pantry_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_pantry" ON pantry_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_pantry" ON pantry_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
