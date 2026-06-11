import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface MealEstimate {
  food_name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  note: string;
}

export interface AnalyzeInput {
  meal_type: string;
  description?: string;
  grams?: number;
  image?: string; // data URL
}

// Calls the `analyze-meal` edge function to estimate calories/macros from a
// description and/or photo.
export function useMealAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (input: AnalyzeInput): Promise<MealEstimate | null> => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke('analyze-meal', { body: input });
    setLoading(false);

    if (error) {
      setError('Could not analyze the meal. Please try again.');
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
    return data as MealEstimate;
  }, []);

  return { analyze, loading, error };
}
