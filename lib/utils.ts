export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayStr(): string {
  return formatDate(new Date());
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function subtractDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatDate(d);
}

// Shift a YYYY-MM-DD date string by N days (negative = backwards).
export function shiftDate(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function getDatesRange(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}

export function formatDisplayDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatFullDate(dateStr: string): string {
  const d = parseDate(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function calcCycleDay(periodStart: string): number {
  const start = parseDate(periodStart);
  const today = new Date();
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

// Cycle day on a specific date (e.g. when viewing a past day). Returns null
// when the date is before the period started.
export function cycleDayOn(periodStart: string, dateStr: string): number | null {
  const start = parseDate(periodStart);
  const date = parseDate(dateStr);
  const diff = Math.round((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff + 1 : null;
}

// Sanitizes free text from a decimal-pad input: keeps digits and a single
// decimal point. Returning the cleaned string (rather than a parsed number)
// lets the field hold an in-progress value like "68." so the user can keep
// typing the fractional part.
export function sanitizeDecimalInput(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  // Keep the first dot, drop any subsequent ones.
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

// Sanitizes free text from a number-pad input: digits only.
export function sanitizeIntegerInput(text: string): string {
  return text.replace(/[^0-9]/g, '');
}

// Parses sanitized numeric input into a number, or null when it is empty or
// not a finite number. Uses Number() (not parseFloat) so partial junk like
// "12abc" becomes null instead of silently parsing to 12.
export function parseNumericInput(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '' || trimmed === '.') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

// Suggested daily nutrition targets for fat loss while preserving muscle, from
// body weight: ~1.8 g/kg protein, ~0.7 g/kg good fat, ~20% calorie deficit
// (maintenance ≈ weight × 30 kcal), carbs filling the rest, plus 4 veg servings.
export function suggestNutritionTargets(weightKg: number): {
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_veg_servings: number;
} {
  const protein = Math.round(weightKg * 1.8);
  const fat = Math.round(weightKg * 0.7);
  const calories = Math.max(1000, Math.round((weightKg * 30 * 0.8) / 50) * 50);
  const carbs = Math.max(20, Math.round((calories - protein * 4 - fat * 9) / 4));
  return {
    target_calories: calories,
    target_protein_g: protein,
    target_carbs_g: carbs,
    target_fat_g: fat,
    target_veg_servings: 4,
  };
}
