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
export function useNutritionTargets(userId: string | undefined) {
  const [targets, setTargets] = useState<NutritionTargets>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fetchTargets = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('user_settings')
      .select('target_calories, target_protein_g, target_carbs_g, target_fat_g, target_veg_servings')
      .eq('user_id', userId)
      .maybeSingle();
    setTargets({ ...EMPTY, ...(data ?? {}) });
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchTargets(); }, [fetchTargets]);
  useVisibilityRefetch(fetchTargets);

  const hasTargets = targets.target_calories != null || targets.target_protein_g != null;
  return { targets, hasTargets, loading, refresh: fetchTargets };
}
