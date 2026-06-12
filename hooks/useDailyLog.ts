import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { todayStr } from '@/lib/utils';
import type { DailyLog, HabitCompletion } from '@/lib/types';
import { HABITS } from '@/lib/types';
import { useVisibilityRefetch } from '@/hooks/useVisibilityRefetch';

export function useDailyLog(userId: string | undefined, date: string = todayStr()) {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [habits, setHabits] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchLog = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', date)
      .maybeSingle();
    setLog(data);

    const { data: habitData } = await supabase
      .from('habit_completions')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', date);

    const habitMap: Record<string, boolean> = {};
    HABITS.forEach(h => { habitMap[h.key] = false; });
    (habitData ?? []).forEach((h: HabitCompletion) => {
      habitMap[h.habit_key] = h.completed;
    });
    setHabits(habitMap);
    setLoading(false);
  }, [userId, date]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  useVisibilityRefetch(fetchLog);

  const saveLog = async (updates: Partial<DailyLog>) => {
    if (!userId) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('daily_logs')
      .upsert({ ...updates, user_id: userId, log_date: date }, { onConflict: 'user_id,log_date' })
      .select()
      .maybeSingle();
    if (!error && data) setLog(data as DailyLog);
    setSaving(false);
    return { error };
  };

  const toggleHabit = async (habitKey: string) => {
    if (!userId) return;
    const newVal = !habits[habitKey];
    setHabits(prev => ({ ...prev, [habitKey]: newVal }));
    await supabase
      .from('habit_completions')
      .upsert(
        { user_id: userId, log_date: date, habit_key: habitKey, completed: newVal },
        { onConflict: 'user_id,log_date,habit_key' }
      );
  };

  const completedCount = Object.values(habits).filter(Boolean).length;
  const totalHabits = HABITS.length;
  const completionPct = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;
  const dailyScore = Math.round((completedCount / totalHabits) * 100);

  return { log, habits, loading, saving, saveLog, toggleHabit, completedCount, totalHabits, completionPct, dailyScore, refresh: fetchLog };
}
