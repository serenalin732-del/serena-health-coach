import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface LabEstimate {
  test_date: string | null;
  cortisol: number | null;
  vitamin_d: number | null;
  progesterone: number | null;
  glucose: number | null;
  hba1c: number | null;
  cholesterol: number | null;
  note: string;
}

// Calls the `analyze-labs` edge function to read lab values from a photo of a
// report, so the user doesn't have to type each number.
export function useLabAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (image: string): Promise<LabEstimate | null> => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke('analyze-labs', { body: { image } });
    setLoading(false);

    if (error) {
      setError('Could not read the lab report. Please try again.');
      return null;
    }
    if (data?.code === 'not_configured') {
      setError('AI analysis is not set up yet.');
      return null;
    }
    if (data?.error) {
      setError(typeof data.error === 'string' ? data.error : 'Something went wrong.');
      return null;
    }
    return data as LabEstimate;
  }, []);

  return { analyze, loading, error };
}
