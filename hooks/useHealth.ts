import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { todayStr } from '@/lib/utils';
import type { SleepLog, CycleLog, LabResult, CgmLog } from '@/lib/types';

export function useSleepLog(userId: string | undefined, date: string = todayStr()) {
  const [log, setLog] = useState<SleepLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', date)
      .maybeSingle()
      .then(({ data }) => {
        setLog(data as SleepLog | null);
        setLoading(false);
      });
  }, [userId, date]);

  const save = async (updates: Partial<SleepLog>) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('sleep_logs')
      .upsert({ ...updates, user_id: userId, log_date: date }, { onConflict: 'user_id,log_date' })
      .select()
      .maybeSingle();
    if (!error && data) setLog(data as SleepLog);
    return { error };
  };

  return { log, loading, save };
}

export function useCycleLogs(userId: string | undefined) {
  const [logs, setLogs] = useState<CycleLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('cycle_logs')
      .select('*')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(12);
    setLogs((data ?? []) as CycleLog[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addLog = async (log: Omit<CycleLog, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('cycle_logs')
      .insert({ ...log, user_id: userId })
      .select()
      .single();
    if (!error && data) setLogs(prev => [data as CycleLog, ...prev]);
    return { error };
  };

  const latest = logs[0] ?? null;
  return { logs, latest, loading, addLog, refresh: fetch };
}

export function useLabResults(userId: string | undefined) {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('lab_results')
      .select('*')
      .eq('user_id', userId)
      .order('test_date', { ascending: false });
    setResults((data ?? []) as LabResult[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addResult = async (result: Omit<LabResult, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('lab_results')
      .insert({ ...result, user_id: userId })
      .select()
      .single();
    if (!error && data) setResults(prev => [data as LabResult, ...prev]);
    return { error };
  };

  return { results, loading, addResult, refresh: fetch };
}

export function useCgmLog(userId: string | undefined, date: string = todayStr()) {
  const [log, setLog] = useState<CgmLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from('cgm_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('log_date', date)
      .maybeSingle()
      .then(({ data }) => {
        setLog(data as CgmLog | null);
        setLoading(false);
      });
  }, [userId, date]);

  const save = async (updates: Partial<CgmLog>) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('cgm_logs')
      .upsert({ ...updates, user_id: userId, log_date: date }, { onConflict: 'user_id,log_date' })
      .select()
      .maybeSingle();
    if (!error && data) setLog(data as CgmLog);
    return { error };
  };

  return { log, loading, save };
}
