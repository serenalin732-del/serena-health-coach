import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useVisibilityRefetch } from '@/hooks/useVisibilityRefetch';

export interface NutritionTargets {
  target_calories: number | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  target_veg_servings: number | null;
}

const EMPTY: NutritionTargets = {
  target_calories: null,
  target_protein_g: null,
  target_carbs_g: null,
  target_fat_g: null,
  target_veg_servings: null,
};

// Reads the user's daily nutrition targets (set in Settings) so the Food page
// can show progress and "remaining" against the plan.
export interface FastingWindow {
  enabled: boolean;
  start: string | null;
  end: string | null;
}

const NO_FAST: FastingWindow = { enabled: false, start: null, end: null };

export function useNutritionTargets(userId: string | undefined) {
  const [targets, setTargets] = useState<NutritionTargets>(EMPTY);
  const [fasting, setFasting] = useState<FastingWindow>(NO_FAST);
  const [loading, setLoading] = useState(true);

  const fetchTargets = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('user_settings')
      .select('target_calories, target_protein_g, target_carbs_g, target_fat_g, target_veg_servings, fasting_enabled, eating_window_start, eating_window_end')
      .eq('user_id', userId)
      .maybeSingle();
    const row = (data ?? {}) as Record<string, unknown>;
    setTargets({ ...EMPTY, ...row } as NutritionTargets);
    setFasting({
      enabled: row.fasting_enabled === true,
      start: (row.eating_window_start as string | null) ?? null,
      end: (row.eating_window_end as string | null) ?? null,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchTargets(); }, [fetchTargets]);
  useVisibilityRefetch(fetchTargets);

  const hasTargets = targets.target_calories != null || targets.target_protein_g != null;
  return { targets, hasTargets, fasting, loading, refresh: fetchTargets };
}
