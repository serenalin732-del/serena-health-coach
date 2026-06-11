// Supabase Edge Function: "coach"
// Reads the signed-in user's recent health data (under RLS, using their own
// access token) and asks an LLM for short, specific, data-grounded coaching.
//
// Provider is auto-selected:
//   - If OPENROUTER_API_KEY is set  -> OpenRouter (OpenAI-compatible), model COACH_MODEL
//     (default "anthropic/claude-3.5-sonnet" — change COACH_MODEL to any OpenRouter model).
//   - Else if ANTHROPIC_API_KEY is set -> Anthropic direct, model COACH_MODEL
//     (default "claude-opus-4-8").
//   - Else -> ships gracefully disabled ({code:'not_configured'}).
//
// Deploy:  supabase functions deploy coach
// Secret:  supabase secrets set OPENROUTER_API_KEY=sk-or-...   (or ANTHROPIC_API_KEY=sk-ant-...)
//          supabase secrets set COACH_MODEL=anthropic/claude-3.5-sonnet   (optional)
import Anthropic from 'npm:@anthropic-ai/sdk@0.68.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are Serena's personal health coach inside a daily wellness app. Her goals are fat loss, better sleep, and steady habits.

You will receive a compact summary of her recent logged data. Write today's coaching as 2-3 short, specific, encouraging points grounded in that data — reference real numbers and trends. Celebrate what's improving, gently flag what's slipping, and give one concrete action for today.

Rules:
- Respond with ONLY the coaching. No preamble, no meta-commentary, no headings, no sign-off.
- Keep it under 110 words total. Use short sentences or brief bullet lines.
- Warm and direct, never preachy. You are not a doctor; avoid medical claims.
- If the data is sparse, encourage her to log a couple of metrics today.`;

type DailyRow = {
  log_date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  protein_g: number | null;
  steps: number | null;
  water_ml: number | null;
};
type HabitRow = { log_date: string; habit_key: string; completed: boolean };

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

function buildSummary(daily: DailyRow[], habits: HabitRow[]): string {
  const byDate: Record<string, { total: number; done: number }> = {};
  const missed: Record<string, number> = {};
  habits.forEach((h) => {
    byDate[h.log_date] ??= { total: 0, done: 0 };
    byDate[h.log_date].total++;
    if (h.completed) byDate[h.log_date].done++;
    else missed[h.habit_key] = (missed[h.habit_key] ?? 0) + 1;
  });
  const dayPcts = Object.values(byDate)
    .filter((v) => v.total > 0)
    .map((v) => (v.done / v.total) * 100);
  const avgHabit =
    dayPcts.length > 0
      ? Math.round(dayPcts.reduce((a, b) => a + b, 0) / dayPcts.length)
      : null;
  const mostMissed = Object.entries(missed).sort((a, b) => b[1] - a[1])[0];

  const lines = [
    `Days logged: ${
      new Set([...daily.map((d) => d.log_date), ...Object.keys(byDate)]).size
    }`,
    `Weight kg: ${trend(daily, 'weight_kg')}`,
    `Waist cm: ${trend(daily, 'waist_cm')}`,
    `Protein g: ${trend(daily, 'protein_g')}`,
    `Steps: ${trend(daily, 'steps')}`,
    `Water ml: ${trend(daily, 'water_ml')}`,
    `Avg habit completion: ${avgHabit == null ? 'no data' : `${avgHabit}%`}`,
  ];
  if (mostMissed) lines.push(`Most-missed habit: ${mostMissed[0]} (${mostMissed[1]}x)`);
  return lines.join('\n');
}

async function viaOpenRouter(apiKey: string, userPrompt: string): Promise<string> {
  const model = Deno.env.get('COACH_MODEL') ?? 'anthropic/claude-3.5-sonnet';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'Serena Health Coach',
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? '').trim();
}

async function viaAnthropic(apiKey: string, userPrompt: string): Promise<string> {
  const model = Deno.env.get('COACH_MODEL') ?? 'claude-opus-4-8';
  const anthropic = new Anthropic({ apiKey });
  const message = await anthropic.messages.create({
    model,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
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
      // Ship gracefully disabled until a provider key is set.
      return json({ code: 'not_configured' });
    }

    const since = new Date(Date.now() - 13 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const [dailyRes, habitRes] = await Promise.all([
      supabase
        .from('daily_logs')
        .select('log_date, weight_kg, waist_cm, protein_g, steps, water_ml')
        .eq('user_id', user.id)
        .gte('log_date', since)
        .order('log_date', { ascending: true }),
      supabase
        .from('habit_completions')
        .select('log_date, habit_key, completed')
        .eq('user_id', user.id)
        .gte('log_date', since),
    ]);

    const summary = buildSummary(
      (dailyRes.data ?? []) as DailyRow[],
      (habitRes.data ?? []) as HabitRow[]
    );

    const userPrompt = `My recent health data (last 14 days):\n\n${summary}\n\nGive me today's coaching.`;
    const text = openrouterKey
      ? await viaOpenRouter(openrouterKey, userPrompt)
      : await viaAnthropic(anthropicKey!, userPrompt);

    return json({ coaching: text });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
