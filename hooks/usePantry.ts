import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useVisibilityRefetch } from '@/hooks/useVisibilityRefetch';
import type { PantryItem } from '@/lib/types';

// The user's personal food library: products built from photographed nutrition
// labels (per-100g), searchable by name/brand when logging a meal.
export function usePantry(userId: string | undefined) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setItems((data ?? []) as PantryItem[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useVisibilityRefetch(fetchItems);

  // Photograph a label -> AI reads per-100g -> save to the pantry.
  const addFromLabel = useCallback(async (image: string): Promise<boolean> => {
    if (!userId) return false;
    setBusy(true);
    setError(null);
    const { data, error: fnErr } = await supabase.functions.invoke('analyze-label', { body: { image } });
    if (fnErr || data?.error) {
      setBusy(false);
      setError('Could not read the label. Please try again.');
      return false;
    }
    if (data?.code === 'not_configured') {
      setBusy(false);
      setError('AI analysis is not set up yet.');
      return false;
    }
    const { data: inserted, error: insErr } = await supabase
      .from('pantry_items')
      .insert({
        user_id: userId,
        name: data.name || 'Food',
        brand: data.brand || null,
        calories_100: data.calories_100,
        protein_100: data.protein_100,
        carbs_100: data.carbs_100,
        fat_100: data.fat_100,
        healthy_fat_100: data.healthy_fat_100,
      })
      .select()
      .single();
    setBusy(false);
    if (insErr || !inserted) {
      setError('Could not save to your pantry. Please try again.');
      return false;
    }
    setItems(prev => [inserted as PantryItem, ...prev]);
    return true;
  }, [userId]);

  const remove = useCallback(async (id: string) => {
    await supabase.from('pantry_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const search = useCallback((q: string): PantryItem[] => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(i => `${i.name} ${i.brand ?? ''}`.toLowerCase().includes(s));
  }, [items]);

  return { items, loading, busy, error, addFromLabel, remove, search, refresh: fetchItems };
}
