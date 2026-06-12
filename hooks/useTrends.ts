import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { subtractDays } from '@/lib/utils';

export type TrendRange = '7d' | '30d' | '90d' | '1y';

const rangeToDays: Record<TrendRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

export interface TrendDataPoint {
  date: string;
  value: number | null;
}

export function useTrends(userId: string | undefined) {
  const [range, setRange] = useState<TrendRange>('30d');
  const [weightData, setWeightData] = useState<TrendDataPoint[]>([]);
  const [waistData, setWaistData] = useState<TrendDataPoint[]>([]);
  const [bodyFatData, setBodyFatData] = useState<TrendDataPoint[]>([]);
  const [proteinData, setProteinData] = useState<TrendDataPoint[]>([]);
  const [sleepData, setSleepData] = useState<TrendDataPoint[]>([]);
  const [habitData, setHabitData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrends = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const days = rangeToDays[range];
    const fromDate = subtractDays(days);

    const [dailyRes, sleepRes, habitRes, mealRes] = await Promise.all([
      supabase
        .from('daily_logs')
        .select('log_date, weight_kg, waist_cm, body_fat_pct, protein_g')
        .eq('user_id', userId)
        .gte('log_date', fromDate)
        .order('log_date', { ascending: true }),
      supabase
        .from('sleep_logs')
        .select('log_date, hours')
        .eq('user_id', userId)
        .gte('log_date', fromDate)
        .order('log_date', { ascending: true }),
      supabase
        .from('habit_completions')
        .select('log_date, completed')
        .eq('user_id', userId)
        .gte('log_date', fromDate),
      supabase
        .from('meal_logs')
        .select('log_date, protein_g')
        .eq('user_id', userId)
        .gte('log_date', fromDate),
    ]);

    const daily = dailyRes.data ?? [];
    setWeightData(daily.map(d => ({ date: d.log_date, value: d.weight_kg })));
    setWaistData(daily.map(d => ({ date: d.log_date, value: d.waist_cm })));
    setBodyFatData(daily.map(d => ({ date: d.log_date, value: d.body_fat_pct })));

    // Protein tracks what was actually eaten: sum each day's logged meals, and
    // fall back to the manual daily_logs field on days with no meals.
    const proteinByDate: Record<string, number> = {};
    (mealRes.data ?? []).forEach((m: { log_date: string; protein_g: number | null }) => {
      if (m.protein_g != null) proteinByDate[m.log_date] = (proteinByDate[m.log_date] ?? 0) + m.protein_g;
    });
    setProteinData(
      daily.map(d => ({
        date: d.log_date,
        value: proteinByDate[d.log_date] != null ? Math.round(proteinByDate[d.log_date]) : d.protein_g,
      }))
    );

    const sleep = sleepRes.data ?? [];
    setSleepData(sleep.map(d => ({ date: d.log_date, value: d.hours })));

    const habitRaw = habitRes.data ?? [];
    const habitByDate: Record<string, { total: number; completed: number }> = {};
    habitRaw.forEach((h: { log_date: string; completed: boolean }) => {
      if (!habitByDate[h.log_date]) habitByDate[h.log_date] = { total: 0, completed: 0 };
      habitByDate[h.log_date].total++;
      if (h.completed) habitByDate[h.log_date].completed++;
    });
    setHabitData(
      Object.entries(habitByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, value: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0 }))
    );

    setLoading(false);
  }, [userId, range]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return { range, setRange, weightData, waistData, bodyFatData, proteinData, sleepData, habitData, loading };
}
