import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { todayStr } from '@/lib/utils';
import type { MealLog } from '@/lib/types';
import { useVisibilityRefetch } from '@/hooks/useVisibilityRefetch';

export function useMeals(userId: string | undefined, date: string = todayStr()) {
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', date)
      .order('created_at', { ascending: true });
    setMeals((data ?? []) as MealLog[]);
    setLoading(false);
  }, [userId, date]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  useVisibilityRefetch(fetchMeals);

  const addMeal = async (meal: Omit<MealLog, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('meal_logs')
      .insert({ ...meal, user_id: userId })
      .select()
      .single();
    if (!error && data) setMeals(prev => [...prev, data as MealLog]);
    return { error };
  };

  const deleteMeal = async (id: string) => {
    const { error } = await supabase.from('meal_logs').delete().eq('id', id);
    if (!error) setMeals(prev => prev.filter(m => m.id !== id));
    return { error };
  };

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories ?? 0),
      protein: acc.protein + (m.protein_g ?? 0),
      carbs: acc.carbs + (m.carbs_g ?? 0),
      fat: acc.fat + (m.fat_g ?? 0),
      healthyFat: acc.healthyFat + (m.healthy_fat_g ?? 0),
      veg: acc.veg + (m.veg_servings ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, healthyFat: 0, veg: 0 }
  );

  const byType = {
    breakfast: meals.filter(m => m.meal_type === 'breakfast'),
    lunch: meals.filter(m => m.meal_type === 'lunch'),
    dinner: meals.filter(m => m.meal_type === 'dinner'),
    snack: meals.filter(m => m.meal_type === 'snack'),
  };

  return { meals, byType, totals, loading, addMeal, deleteMeal, refresh: fetchMeals };
}
