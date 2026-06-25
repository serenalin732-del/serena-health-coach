import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';
import { todayStr } from '@/lib/utils';

// Calls a coaching Supabase Edge Function (`coach` by default, or `food-coach`
// for the nutrition-focused coach), which reads the user's recent data and
// returns short AI coaching. Generation is on-demand (a tap) to avoid an API
// call on every screen open. The UI language is passed along so the coaching
// comes back in the same language.
export function useCoach(fn: 'coach' | 'food-coach' = 'coach') {
  const { lang } = useI18n();
  const [coaching, setCoaching] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke(fn, { body: { lang, date: todayStr() } });
    setLoading(false);

    if (error) {
      setError('Could not reach your coach. Please try again.');
      return;
    }
    if (data?.code === 'not_configured') {
      setConfigured(false);
      return;
    }
    if (data?.error) {
      setError(typeof data.error === 'string' ? data.error : 'Something went wrong.');
      return;
    }
    setCoaching(data?.coaching ?? null);
  }, [lang, fn]);

  // Clear stale coaching (e.g. after the day's meals change) so the card shows
  // the "coach me" prompt again instead of out-of-date advice.
  const reset = useCallback(() => {
    setCoaching(null);
    setError(null);
  }, []);

  return { coaching, loading, error, configured, generate, reset };
}
