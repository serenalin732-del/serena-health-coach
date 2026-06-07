export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  height_cm: number | null;
  created_at: string;
  updated_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  body_fat_pct: number | null;
  steps: number | null;
  water_ml: number | null;
  protein_g: number | null;
  cycle_day: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HabitCompletion {
  id: string;
  user_id: string;
  log_date: string;
  habit_key: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealLog {
  id: string;
  user_id: string;
  log_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  log_date: string;
  hours: number | null;
  score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CycleLog {
  id: string;
  user_id: string;
  period_start: string;
  cycle_length_days: number;
  symptoms: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LabResult {
  id: string;
  user_id: string;
  test_date: string;
  cortisol: number | null;
  vitamin_d: number | null;
  progesterone: number | null;
  glucose: number | null;
  hba1c: number | null;
  cholesterol: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CgmLog {
  id: string;
  user_id: string;
  log_date: string;
  daily_avg_glucose: number | null;
  time_in_range_pct: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  reminder_morning: boolean;
  reminder_lunch: boolean;
  reminder_evening: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      user_profiles: { Row: UserProfile; Insert: Partial<UserProfile>; Update: Partial<UserProfile> };
      daily_logs: { Row: DailyLog; Insert: Partial<DailyLog>; Update: Partial<DailyLog> };
      habit_completions: { Row: HabitCompletion; Insert: Partial<HabitCompletion>; Update: Partial<HabitCompletion> };
      meal_logs: { Row: MealLog; Insert: Partial<MealLog>; Update: Partial<MealLog> };
      sleep_logs: { Row: SleepLog; Insert: Partial<SleepLog>; Update: Partial<SleepLog> };
      cycle_logs: { Row: CycleLog; Insert: Partial<CycleLog>; Update: Partial<CycleLog> };
      lab_results: { Row: LabResult; Insert: Partial<LabResult>; Update: Partial<LabResult> };
      cgm_logs: { Row: CgmLog; Insert: Partial<CgmLog>; Update: Partial<CgmLog> };
      user_settings: { Row: UserSettings; Insert: Partial<UserSettings>; Update: Partial<UserSettings> };
    };
  };
}

export const HABITS = [
  { key: 'protein_90g', label: 'Protein >= 90g', icon: 'dumbbell' },
  { key: 'veggies_2', label: 'Vegetables >= 2 servings', icon: 'leaf' },
  { key: 'steps_8000', label: 'Steps >= 8,000', icon: 'footprints' },
  { key: 'strength_training', label: 'Strength Training', icon: 'zap' },
  { key: 'sleep_7h', label: 'Sleep >= 7 hours', icon: 'moon' },
  { key: 'water_1800ml', label: 'Water >= 1.8L', icon: 'droplets' },
  { key: 'low_carb_dinner', label: 'Low Carb Dinner', icon: 'utensils' },
  { key: 'no_sugary_drinks', label: 'No Sugary Drinks', icon: 'ban' },
] as const;

export type HabitKey = typeof HABITS[number]['key'];
