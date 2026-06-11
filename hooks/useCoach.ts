import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// Calls the `coach` Supabase Edge Function, which reads the user's recent data
// and returns short Claude-generated coaching. Generation is on-demand (a tap)
// to avoid an API call on every dashboard open.
export function useCoach() {
  const [coaching, setCoaching] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke('coach');
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
  }, []);

  return { coaching, loading, error, configured, generate };
}
