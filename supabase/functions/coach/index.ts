// Supabase Edge Function: "coach"
// Reads the signed-in user's recent health data (under RLS, using their own
// access token) — daily logs, habits, meals, sleep, cycle, labs, CGM, goals —
// and asks an LLM for short, specific, data-grounded coaching.
//
// Provider is auto-selected:
//   - If OPENROUTER_API_KEY is set  -> OpenRouter (OpenAI-compatible), model COACH_MODEL
//     (default "openai/gpt-4o-mini" — change COACH_MODEL to any openrouter.ai/models slug).
//   - Else if ANTHROPIC_API_KEY is set -> Anthropic direct, model COACH_MODEL
//     (default "claude-opus-4-8").
//   - Else -> ships gracefully disabled ({code:'not_configured'}).
//
// Request body: { lang?: 'en' | 'zh' } — coaching is returned in that language.
//
// Deploy:  supabase functions deploy coach
// Secret:  supabase secrets set OPENROUTER_API_KEY=sk-or-...   (or ANTHROPIC_API_KEY=sk-ant-...)
import Anthropic from 'npm:@anthropic-ai/sdk@0.68.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are the user's personal AI health coach inside a daily wellness app focused on fat loss, sleep, and steady habits.

You will receive a compact summary of their recent logged data (body metrics, habits, nutrition, sleep, cycle, labs, glucose) and possibly their goals. Write today's coaching as 2-3 short, specific, encouraging points grounded in that data — reference real numbers and trends across ALL the data provided, not just weight. Celebrate what's improving, gently flag what's slipping, and give one concrete action for today.

Rules:
- Respond with ONLY the coaching. No preamble, no meta-commentary, no headings, no sign-off.
- Keep it under 120 words total. Use short sentences or brief bullet lines.
- Warm and direct, never preachy. You are not a doctor; avoid medical claims.
- If the data is sparse, encourage logging a couple of metrics today.
- If goals are provided, anchor the coaching to them: how far from each target, whether the recent trend is moving toward it at a healthy pace, and what to adjust today.`;

// The eight daily habits (must match HABITS in lib/types.ts). Used as the fixed
// denominator for habit-completion %, since unchecked habits have no row.
const HABIT_KEYS = [
  'protein_90g',
  'veggies_2',
  'steps_8000',
  'strength_training',
  'sleep_7h',
  'water_1800ml',
  'low_carb_dinner',
  'no_sugary_drinks',
];

type DailyRow = {
  log_date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  body_fat_pct: number | null;
  lean_mass_kg: number | null;
  resting_hr: number | null;
  hrv_ms: number | null;
  protein_g: number | null;
  steps: number | null;
  active_kcal: number | null;
  water_ml: number | null;
};
type HabitRow = { log_date: string; habit_key: string; completed: boolean };
type MealRow = { log_date: string; meal_type: string; food_name: string; calories: number | null; protein_g: number | null };
type SleepRow = { log_date: string; hours: number | null; score: number | null };
type CgmRow = { log_date: string; daily_avg_glucose: number | null; time_in_range_pct: number | null };

function trend(rows: DailyRow[], key: keyof DailyRow): string {
  const pts = rows
    .filter((r) => r[key] != null)
    .map((r) => ({ d: r.log_date, v: r[key] as number }));
  if (pts.length === 0) return 'no data';
  const latest = pts[pts.length - 1];
  if (pts.length === 1) return `${latest.v} (1 entry)`;
  const delta = Math.round((latest.v - pts[0].v) * 10) / 10;
  const dir = delta < 0 ? 'down' : delta > 0 ? 'up' : 'flat';
  return `${latest.v} (${dir} ${Math.abs(delta)} over ${pts.length} entries)`;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function buildSummary(
  daily: DailyRow[],
  habits: HabitRow[],
  meals: MealRow[],
  sleep: SleepRow[],
  cycle: { period_start: string; cycle_length_days: number } | null,
  lab: Record<string, unknown> | null,
  cgm: CgmRow[]
): string {
  const lines: string[] = [];

  // Body metrics
  lines.push(`Weight kg: ${trend(daily, 'weight_kg')}`);
  lines.push(`Waist cm: ${trend(daily, 'waist_cm')}`);
  lines.push(`Body fat %: ${trend(daily, 'body_fat_pct')}`);
  lines.push(`Lean body mass kg: ${trend(daily, 'lean_mass_kg')}`);
  lines.push(`Resting HR bpm: ${trend(daily, 'resting_hr')}`);
  lines.push(`HRV ms: ${trend(daily, 'hrv_ms')}`);
  lines.push(`Steps: ${trend(daily, 'steps')}`);
  lines.push(`Active energy kcal/day: ${trend(daily, 'active_kcal')}`);
  lines.push(`Water ml: ${trend(daily, 'water_ml')}`);

  // Habits — an unchecked habit has NO row (only toggled ones are stored), so
  // the denominator must be the full habit list, not the number of rows, or a
  // day where only completed habits were tapped reads as 100%.
  const doneByDate: Record<string, Set<string>> = {};
  habits.forEach((h) => {
    doneByDate[h.log_date] ??= new Set<string>();
    if (h.completed) doneByDate[h.log_date].add(h.habit_key);
  });
  const loggedDates = Object.keys(doneByDate);
  const dayPcts = loggedDates.map((d) => (doneByDate[d].size / HABIT_KEYS.length) * 100);
  const avgHabit = avg(dayPcts);
  lines.push(`Avg habit completion: ${avgHabit == null ? 'no data' : `${Math.round(avgHabit)}%`}`);
  // Most-missed: across logged days, which habits were left undone most often.
  const missCount: Record<string, number> = {};
  loggedDates.forEach((d) => {
    HABIT_KEYS.forEach((k) => { if (!doneByDate[d].has(k)) missCount[k] = (missCount[k] ?? 0) + 1; });
  });
  const mostMissed = Object.entries(missCount).sort((a, b) => b[1] - a[1])[0];
  if (mostMissed && mostMissed[1] > 0) {
    lines.push(`Most-missed habit: ${mostMissed[0]} (${mostMissed[1]} of ${loggedDates.length} logged day(s))`);
  }

  // Nutrition (from meal logs)
  if (meals.length > 0) {
    const calByDay: Record<string, number> = {};
    const protByDay: Record<string, number> = {};
    meals.forEach((m) => {
      if (m.calories != null) calByDay[m.log_date] = (calByDay[m.log_date] ?? 0) + m.calories;
      if (m.protein_g != null) protByDay[m.log_date] = (protByDay[m.log_date] ?? 0) + m.protein_g;
    });
    const avgCal = avg(Object.values(calByDay));
    const avgProt = avg(Object.values(protByDay));
    const mealDays = new Set(meals.map((m) => m.log_date)).size;
    const recent = meals.slice(-10).map((m) => m.food_name).join(', ');
    lines.push(
      `Nutrition (last 7d): meals logged on ${mealDays} day(s)` +
        (avgCal != null ? `, ~${Math.round(avgCal)} kcal/day` : '') +
        (avgProt != null ? `, ~${Math.round(avgProt)} g protein/day` : '')
    );
    if (recent) lines.push(`Recent foods: ${recent}`);
  } else {
    lines.push('Nutrition: no meals logged in the last 7 days');
  }

  // Sleep
  const sleepHours = sleep.filter((s) => s.hours != null).map((s) => s.hours as number);
  if (sleepHours.length > 0) {
    lines.push(`Sleep: avg ${avg(sleepHours)}h over ${sleepHours.length} night(s) logged (last 14d)`);
  } else {
    lines.push('Sleep: no sleep logged in the last 14 days');
  }

  // Cycle
  if (cycle) {
    const start = new Date(cycle.period_start + 'T00:00:00Z').getTime();
    const day = Math.floor((Date.now() - start) / 86_400_000) + 1;
    if (day >= 1) lines.push(`Menstrual cycle: day ${day} (typical cycle ${cycle.cycle_length_days}d)`);
  }

  // Labs (most recent)
  if (lab) {
    const vals: string[] = [];
    for (const [k, label] of [
      ['cortisol', 'cortisol'],
      ['vitamin_d', 'vitamin D'],
      ['progesterone', 'progesterone'],
      ['glucose', 'glucose'],
      ['hba1c', 'HbA1c'],
      ['cholesterol', 'cholesterol'],
    ] as const) {
      if (lab[k] != null) vals.push(`${label} ${lab[k]}`);
    }
    if (vals.length > 0) lines.push(`Latest labs (${lab.test_date}): ${vals.join(', ')}`);
  }

  // CGM
  const glu = cgm.filter((c) => c.daily_avg_glucose != null).map((c) => c.daily_avg_glucose as number);
  const tir = cgm.filter((c) => c.time_in_range_pct != null).map((c) => c.time_in_range_pct as number);
  if (glu.length > 0 || tir.length > 0) {
    lines.push(
      `CGM (last 14d):` +
        (glu.length > 0 ? ` avg glucose ${avg(glu)} mg/dL` : '') +
        (tir.length > 0 ? `, time in range ${avg(tir)}%` : '')
    );
  }

  return lines.join('\n');
}

async function viaOpenRouter(apiKey: string, system: string, userPrompt: string): Promise<string> {
  const model = Deno.env.get('COACH_MODEL') ?? 'openai/gpt-4o-mini';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Health Coach',
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? '').trim();
}

async function viaAnthropic(apiKey: string, system: string, userPrompt: string): Promise<string> {
  const model = Deno.env.get('COACH_MODEL') ?? 'claude-opus-4-8';
  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model,
    max_tokens: 500,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!openrouterKey && !anthropicKey) {
      return json({ code: 'not_configured' });
    }

    const body = await req.json().catch(() => ({}));
    const lang = (body as { lang?: string }).lang === 'zh' ? 'zh' : 'en';

    const since14 = new Date(Date.now() - 13 * 86_400_000).toISOString().slice(0, 10);
    const since7 = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);

    const [dailyRes, habitRes, mealRes, sleepRes, cycleRes, labRes, cgmRes, settingsRes, profileRes] =
      await Promise.all([
        supabase
          .from('daily_logs')
          .select('log_date, weight_kg, waist_cm, body_fat_pct, lean_mass_kg, resting_hr, hrv_ms, protein_g, steps, active_kcal, water_ml')
          .eq('user_id', user.id)
          .gte('log_date', since14)
          .order('log_date', { ascending: true }),
        supabase
          .from('habit_completions')
          .select('log_date, habit_key, completed')
          .eq('user_id', user.id)
          .gte('log_date', since14),
        supabase
          .from('meal_logs')
          .select('log_date, meal_type, food_name, calories, protein_g')
          .eq('user_id', user.id)
          .gte('log_date', since7)
          .order('log_date', { ascending: true }),
        supabase
          .from('sleep_logs')
          .select('log_date, hours, score')
          .eq('user_id', user.id)
          .gte('log_date', since14),
        supabase
          .from('cycle_logs')
          .select('period_start, cycle_length_days')
          .eq('user_id', user.id)
          .order('period_start', { ascending: false })
          .limit(1),
        supabase
          .from('lab_results')
          .select('test_date, cortisol, vitamin_d, progesterone, glucose, hba1c, cholesterol')
          .eq('user_id', user.id)
          .order('test_date', { ascending: false })
          .limit(8),
        supabase
          .from('cgm_logs')
          .select('log_date, daily_avg_glucose, time_in_range_pct')
          .eq('user_id', user.id)
          .gte('log_date', since14),
        supabase
          .from('user_settings')
          .select('target_weight_kg, target_waist_cm, goal_focus')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase.from('user_profiles').select('full_name').eq('id', user.id).maybeSingle(),
      ]);

    // Reports are stored as separate (often partial) rows; merge the most recent
    // non-null value per marker so the coach sees the full latest picture.
    const labRows = (labRes.data ?? []) as Record<string, unknown>[];
    let mergedLab: Record<string, unknown> | null = null;
    if (labRows.length > 0) {
      mergedLab = { test_date: labRows[0].test_date };
      for (const f of ['cortisol', 'vitamin_d', 'progesterone', 'glucose', 'hba1c', 'cholesterol']) {
        const row = labRows.find((r) => r[f] != null);
        if (row) mergedLab[f] = row[f];
      }
    }

    const summary = buildSummary(
      (dailyRes.data ?? []) as DailyRow[],
      (habitRes.data ?? []) as HabitRow[],
      (mealRes.data ?? []) as MealRow[],
      (sleepRes.data ?? []) as SleepRow[],
      (cycleRes.data?.[0] ?? null) as { period_start: string; cycle_length_days: number } | null,
      mergedLab,
      (cgmRes.data ?? []) as CgmRow[]
    );

    const goalRow = settingsRes.data as
      | { target_weight_kg: number | null; target_waist_cm: number | null; goal_focus: string | null }
      | null;
    const goalLines: string[] = [];
    if (goalRow?.target_weight_kg != null) goalLines.push(`Target weight: ${goalRow.target_weight_kg} kg`);
    if (goalRow?.target_waist_cm != null) goalLines.push(`Target waist: ${goalRow.target_waist_cm} cm`);
    if (goalRow?.goal_focus) goalLines.push(`Stated focus: ${goalRow.goal_focus}`);
    const goalsBlock = goalLines.length ? `\n\nMy goals:\n${goalLines.join('\n')}` : '';

    let system = SYSTEM_PROMPT;
    const name = (profileRes.data as { full_name?: string | null } | null)?.full_name;
    if (name) system += `\n\nThe user's name is ${name}.`;
    if (lang === 'zh') system += '\n\nRespond in Simplified Chinese (简体中文).';

    const userPrompt = `My recent health data:\n\n${summary}${goalsBlock}\n\nGive me today's coaching.`;
    const text = openrouterKey
      ? await viaOpenRouter(openrouterKey, system, userPrompt)
      : await viaAnthropic(anthropicKey!, system, userPrompt);

    return json({ coaching: text });
  } catch (e) {
    // Logged so failures (bad model slug, no credits, etc.) are visible in the
    // function logs instead of just a generic client error.
    console.error('coach error:', e instanceof Error ? (e.stack ?? e.message) : String(e));
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
