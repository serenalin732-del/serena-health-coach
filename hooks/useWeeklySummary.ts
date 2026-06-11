import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { subtractDays } from '@/lib/utils';

export interface WeeklySummary {
  // Change from the earliest to the latest logged value in the window.
  weightDelta: number | null;
  waistDelta: number | null;
  // Most recent logged value in the window.
  latestWeight: number | null;
  latestWaist: number | null;
  // Average daily habit completion percentage across days with habit data.
  avgHabitPct: number | null;
  // Distinct days in the window that have any logged data.
  daysLogged: number;
}

export const EMPTY_WEEKLY_SUMMARY: WeeklySummary = {
  weightDelta: null,
  waistDelta: null,
  latestWeight: null,
  latestWaist: null,
  avgHabitPct: null,
  daysLogged: 0,
};

type DailyRow = { log_date: string; weight_kg: number | null; waist_cm: number | null };
type HabitRow = { log_date: string; completed: boolean };

function metricDelta(daily: DailyRow[], key: 'weight_kg' | 'waist_cm') {
  const points = daily
    .filter(d => d[key] != null)
    .sort((a, b) => a.log_date.localeCompare(b.log_date));
  if (points.length === 0) return { delta: null as number | null, latest: null as number | null };
  const latest = points[points.length - 1][key] as number;
  const delta = points.length >= 2 ? latest - (points[0][key] as number) : null;
  // Avoid -0 and tame floating-point noise.
  const rounded = delta === null ? null : Math.round(delta * 10) / 10 || 0;
  return { delta: rounded, latest };
}

export function computeWeeklySummary(daily: DailyRow[], habits: HabitRow[]): WeeklySummary {
  const weight = metricDelta(daily, 'weight_kg');
  const waist = metricDelta(daily, 'waist_cm');

  const byDate: Record<string, { total: number; completed: number }> = {};
  habits.forEach(h => {
    if (!byDate[h.log_date]) byDate[h.log_date] = { total: 0, completed: 0 };
    byDate[h.log_date].total++;
    if (h.completed) byDate[h.log_date].completed++;
  });
  const dayPercents = Object.values(byDate)
    .filter(v => v.total > 0)
    .map(v => (v.completed / v.total) * 100);
  const avgHabitPct =
    dayPercents.length > 0
      ? Math.round(dayPercents.reduce((a, b) => a + b, 0) / dayPercents.length)
      : null;

  const loggedDates = new Set<string>();
  daily.forEach(d => {
    if (d.weight_kg != null || d.waist_cm != null) loggedDates.add(d.log_date);
  });
  Object.keys(byDate).forEach(date => loggedDates.add(date));

  return {
    weightDelta: weight.delta,
    waistDelta: waist.delta,
    latestWeight: weight.latest,
    latestWaist: waist.latest,
    avgHabitPct,
    daysLogged: loggedDates.size,
  };
}

export function useWeeklySummary(userId: string | undefined) {
  const [summary, setSummary] = useState<WeeklySummary>(EMPTY_WEEKLY_SUMMARY);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const fromDate = subtractDays(6); // last 7 days, inclusive of today

    const [dailyRes, habitRes] = await Promise.all([
      supabase
        .from('daily_logs')
        .select('log_date, weight_kg, waist_cm')
        .eq('user_id', userId)
        .gte('log_date', fromDate),
      supabase
        .from('habit_completions')
        .select('log_date, completed')
        .eq('user_id', userId)
        .gte('log_date', fromDate),
    ]);

    setSummary(computeWeeklySummary((dailyRes.data ?? []) as DailyRow[], (habitRes.data ?? []) as HabitRow[]));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { ...summary, loading, refresh: fetchSummary };
}
