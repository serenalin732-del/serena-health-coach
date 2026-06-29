// Supabase Edge Function: "food-coach"
// Nutrition-focused coach for the Food page. Reads TODAY's meals and the user's
// daily targets + goal, then gives short, practical advice for the rest of the
// day: how to hit protein, stay under calories/carbs, get good fats and veg.
//
// Provider auto-selected like `coach` (OpenRouter, else Anthropic).
//
// Deploy:  supabase functions deploy food-coach
// Secret:  reuses OPENROUTER_API_KEY (or ANTHROPIC_API_KEY).
import Anthropic from 'npm:@anthropic-ai/sdk@0.68.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are the user's personal nutrition coach inside the Food tab. You give DIRECTIVE, precise, do-this-now guidance to help them hit their daily targets — usually fat loss while keeping muscle. Be a real coach giving clear instructions, not vague encouragement.

You receive: today's meals (by meal type) with macros, today's running totals, their daily targets and exactly what's REMAINING, today's water vs ~1800ml, their goal, and recent foods.

Write a short, friendly but DIRECTIVE message (about 90-150 words):
- State the key numbers: how many calories and grams of protein are LEFT for today.
- Look meal by meal. If breakfast/lunch already used most of the calorie budget, say so and give the remaining meal a CONCRETE CEILING — e.g. "dinner ≤ 350 kcal: a palm of protein + 2 fists of veg, skip the rice."
- If they're OVER a target (calories/carbs), say it plainly and tell them exactly how to compensate tonight (lighter dinner, more protein/veg, no extra carbs).
- If protein is behind, name specific foods with rough grams to close the gap.
- If WATER is under ~1800ml, tell them how much more to drink before bed.
- When a target is being missed, add a quick WHY — the concrete consequence for their fat-loss goal — so they understand the stakes, in a brief clause (not a lecture): e.g. low protein → risk losing muscle and feeling hungrier; over on calories/carbs → slows or stalls fat loss and can spike blood sugar; too little water → can stall progress, cause bloating/water retention and weaker workouts; low veg → less fullness, fiber and micronutrients.
- Give 1-2 concrete next-meal/snack options WITH portions and rough calories.

Rules:
- Warm but direct and specific — give numbers and clear actions, not "try to". No headings, no sign-off.
- Ground every instruction in their real numbers and foods; never generic.
- You are not a doctor; factor in any health context gently, no medical claims.
- If nothing is logged yet today, tell them what a target-friendly day looks like (rough calories per meal) and to log as they go.`;

function todayIn(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function viaOpenRouter(apiKey: string, system: string, userPrompt: string): Promise<string> {
  const model = Deno.env.get('COACH_MODEL') ?? 'openai/gpt-4o-mini';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Health Coach Food' },
    body: JSON.stringify({ model, max_tokens: 600, messages: [{ role: 'system', content: system }, { role: 'user', content: userPrompt }] }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? '').trim();
}

async function viaAnthropic(apiKey: string, system: string, userPrompt: string): Promise<string> {
  const model = Deno.env.get('COACH_MODEL') ?? 'claude-opus-4-8';
  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({ model, max_tokens: 600, system, messages: [{ role: 'user', content: userPrompt }] });
  return message.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('').trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!openrouterKey && !anthropicKey) return json({ code: 'not_configured' });

    const body = await req.json().catch(() => ({}));
    const lang = (body as { lang?: string }).lang === 'zh' ? 'zh' : 'en';

    const [settingsRes, profileRes] = await Promise.all([
      supabase
        .from('user_settings')
        .select('timezone, goal_focus, health_context, target_calories, target_protein_g, target_carbs_g, target_fat_g, target_veg_servings')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('user_profiles').select('full_name').eq('id', user.id).maybeSingle(),
    ]);
    const settings = (settingsRes.data ?? {}) as Record<string, number | string | null>;
    const tz = (settings.timezone as string) || 'UTC';
    // Prefer the client's local date so the coach reads exactly the day the user
    // is looking at (avoids any timezone mismatch with how meals are dated).
    const reqDate = (body as { date?: string }).date;
    const today = typeof reqDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(reqDate) ? reqDate : todayIn(tz);
    const since7 = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);

    const [todayRes, recentRes, dailyRes] = await Promise.all([
      supabase
        .from('meal_logs')
        .select('meal_type, food_name, grams, calories, protein_g, carbs_g, fat_g, healthy_fat_g, veg_servings')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .order('created_at', { ascending: true }),
      supabase
        .from('meal_logs')
        .select('food_name')
        .eq('user_id', user.id)
        .gte('log_date', since7)
        .order('log_date', { ascending: false })
        .limit(25),
      supabase
        .from('daily_logs')
        .select('water_ml, steps, active_kcal')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle(),
    ]);
    const dayLog = (dailyRes.data ?? {}) as { water_ml: number | null; steps: number | null; active_kcal: number | null };

    const meals = (todayRes.data ?? []) as Array<Record<string, number | string | null>>;
    const sum = (k: string) => meals.reduce((a, m) => a + (typeof m[k] === 'number' ? (m[k] as number) : 0), 0);
    const totals = {
      calories: Math.round(sum('calories')),
      protein: Math.round(sum('protein_g')),
      carbs: Math.round(sum('carbs_g')),
      fat: Math.round(sum('fat_g')),
      good_fat: Math.round(sum('healthy_fat_g')),
      veg: Math.round(sum('veg_servings') * 10) / 10,
    };

    const lines: string[] = [];
    if (meals.length > 0) {
      lines.push(`Today's meals:`);
      for (const m of meals) {
        const macros = [
          m.grams != null ? `${m.grams}g` : null,
          m.calories != null ? `${m.calories}kcal` : null,
          m.protein_g != null ? `P${m.protein_g}` : null,
          m.carbs_g != null ? `C${m.carbs_g}` : null,
          m.fat_g != null ? `F${m.fat_g}` : null,
        ].filter(Boolean).join(' ');
        lines.push(`- ${m.meal_type}: ${m.food_name} (${macros})`);
      }
      lines.push(`Running totals: ${totals.calories} kcal, protein ${totals.protein}g, carbs ${totals.carbs}g, fat ${totals.fat}g (of which healthy ${totals.good_fat}g), veg ${totals.veg} servings`);
    } else {
      lines.push('No meals logged yet today.');
    }
    lines.push(
      `Water today: ${dayLog.water_ml != null ? `${dayLog.water_ml} ml` : 'not logged'} (aim ~1800 ml).` +
        (dayLog.steps != null ? ` Steps: ${dayLog.steps}.` : '') +
        (dayLog.active_kcal != null ? ` Active energy burned: ${dayLog.active_kcal} kcal.` : '')
    );

    const tgt = (k: string) => (typeof settings[k] === 'number' ? (settings[k] as number) : null);
    const targetLines: string[] = [];
    const remain = (label: string, consumed: number, target: number | null, unit: string) => {
      if (target == null) return;
      targetLines.push(`${label}: ${consumed} / ${target} ${unit} (${Math.round(target - consumed)} ${unit} left)`);
    };
    remain('Calories', totals.calories, tgt('target_calories'), 'kcal');
    remain('Protein', totals.protein, tgt('target_protein_g'), 'g');
    remain('Carbs', totals.carbs, tgt('target_carbs_g'), 'g');
    remain('Fat', totals.fat, tgt('target_fat_g'), 'g');
    remain('Vegetables', totals.veg, tgt('target_veg_servings'), 'servings');
    const targetsBlock = targetLines.length
      ? `\n\nDaily targets and what's left:\n${targetLines.join('\n')}`
      : `\n\n(No daily targets set yet — suggest setting them, and give general guidance.)`;

    const recentFoods = [...new Set((recentRes.data ?? []).map((r) => (r as { food_name: string }).food_name))].slice(0, 12).join(', ');
    const recentBlock = recentFoods ? `\n\nRecent foods (last 7d): ${recentFoods}` : '';
    const goalBlock = settings.goal_focus ? `\n\nGoal: ${settings.goal_focus}` : '';
    const healthBlock = settings.health_context ? `\n\nHealth context (no medical advice): ${settings.health_context}` : '';

    let system = SYSTEM_PROMPT;
    const name = (profileRes.data as { full_name?: string | null } | null)?.full_name;
    if (name) system += `\n\nThe user's name is ${name}.`;
    if (lang === 'zh') system += '\n\nRespond in Simplified Chinese (简体中文).';

    const userPrompt = `${lines.join('\n')}${targetsBlock}${goalBlock}${healthBlock}${recentBlock}\n\nGive me practical nutrition coaching for the rest of today.`;
    const text = openrouterKey
      ? await viaOpenRouter(openrouterKey, system, userPrompt)
      : await viaAnthropic(anthropicKey!, system, userPrompt);

    return json({ coaching: text });
  } catch (e) {
    console.error('food-coach error:', e instanceof Error ? (e.stack ?? e.message) : String(e));
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
