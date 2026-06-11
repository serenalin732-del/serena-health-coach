// Supabase Edge Function: "analyze-meal"
// Estimates calories + macros from a short description and/or a photo, so the
// user doesn't have to know nutrition numbers. OpenRouter (vision-capable),
// reusing OPENROUTER_API_KEY. Model = MEAL_MODEL (default "openai/gpt-4o-mini",
// which supports image input).
//
// Deploy:  supabase functions deploy analyze-meal
// (No new secret needed if OPENROUTER_API_KEY is already set for `coach`.)
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM = `You are a nutrition estimator. Given a short description and/or a photo of food, estimate the nutrition for the WHOLE portion described.

Identify the food, then estimate calories and macros. If an approximate gram amount is given, base the estimate on it. If only a photo is given, assume one typical serving unless the photo clearly shows more or less.

Respond with ONLY a JSON object — no prose, no code fences:
{"food_name": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "note": string}

Rules:
- Numbers are for the whole portion, rounded to whole numbers.
- "note" is one short sentence stating the portion you assumed.
- Always give your single best estimate, even if uncertain.`;

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  return JSON.parse(cleaned);
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) return json({ code: 'not_configured' });

    const body = await req.json().catch(() => ({}));
    const { meal_type, description, grams, image } = body as {
      meal_type?: string;
      description?: string;
      grams?: number;
      image?: string;
    };

    if (!description && !image) {
      return json({ error: 'Add a description or a photo first.' }, 400);
    }

    const userText =
      `Meal type: ${meal_type ?? 'unknown'}.` +
      (description ? ` Description: ${description}.` : '') +
      (grams ? ` Approximate total grams: ${grams}.` : '') +
      ' Estimate the nutrition for this portion.';

    const userContent = image
      ? [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: image } },
        ]
      : userText;

    const model = Deno.env.get('MEAL_MODEL') ?? 'openai/gpt-4o-mini';
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Serena Meal Analysis',
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userContent },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? '';
    const parsed = parseJson(raw);

    return json({
      food_name: String(parsed.food_name ?? '').slice(0, 120),
      calories: num(parsed.calories),
      protein_g: num(parsed.protein_g),
      carbs_g: num(parsed.carbs_g),
      fat_g: num(parsed.fat_g),
      note: String(parsed.note ?? '').slice(0, 200),
    });
  } catch (e) {
    console.error('analyze-meal error:', e instanceof Error ? (e.stack ?? e.message) : String(e));
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
