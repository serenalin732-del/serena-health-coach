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

const SYSTEM = `You are a precise nutrition estimator for someone tracking calories and macros for fat loss. Given a short description and/or a photo of food, estimate the nutrition for the WHOLE portion described.

Identify each food, estimate its weight in grams, and compute nutrition from realistic per-100g values for that food. If an approximate gram amount is given, use it as the total weight. If only a photo is given, estimate grams from typical serving sizes and what's visible. Sum all components for the whole portion.

Respond with ONLY a JSON object — no prose, no code fences:
{"food_name": string, "grams": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "healthy_fat_g": number, "veg_servings": number, "note": string}

Rules:
- Numbers are for the WHOLE portion, rounded to whole numbers (grams may be 0).
- "grams" is your estimated total weight of the portion.
- "fat_g" is total fat. "healthy_fat_g" is the portion of that fat which is unsaturated / healthy (olive oil, avocado, nuts, fish, seeds); use 0 for mostly saturated/fried food.
- "veg_servings" = servings of vegetables in the portion (1 serving ≈ 80g of non-starchy vegetables); 0 if none. Potatoes/corn/rice are NOT vegetables here.
- Keep calories consistent with macros (~4 kcal/g protein & carbs, ~9 kcal/g fat).
- "note" is one short sentence stating the portion/weight you assumed.
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
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall back to the outermost {...} in case the model added stray text.
    const a = cleaned.indexOf('{');
    const b = cleaned.lastIndexOf('}');
    if (a >= 0 && b > a) return JSON.parse(cleaned.slice(a, b + 1));
    throw new Error('Model did not return JSON');
  }
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

    // The model/provider can flake (transient error, empty body, or a truncated
    // response that won't parse). Retry a few times so the user doesn't have to.
    let parsed: Record<string, unknown> | null = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'Health Coach Meal Analysis',
          },
          body: JSON.stringify({
            model,
            max_tokens: 800,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: SYSTEM },
              { role: 'user', content: userContent },
            ],
          }),
        });
        if (!res.ok) {
          lastErr = new Error(`OpenRouter ${res.status}: ${await res.text()}`);
          continue;
        }
        const data = await res.json();
        const raw = data?.choices?.[0]?.message?.content ?? '';
        if (!raw) {
          lastErr = new Error('Empty response from model');
          continue;
        }
        parsed = parseJson(raw);
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!parsed) throw lastErr ?? new Error('Could not analyze the meal');

    return json({
      food_name: String(parsed.food_name ?? '').slice(0, 120),
      grams: num(parsed.grams),
      calories: num(parsed.calories),
      protein_g: num(parsed.protein_g),
      carbs_g: num(parsed.carbs_g),
      fat_g: num(parsed.fat_g),
      healthy_fat_g: num(parsed.healthy_fat_g),
      veg_servings: num(parsed.veg_servings),
      note: String(parsed.note ?? '').slice(0, 200),
    });
  } catch (e) {
    console.error('analyze-meal error:', e instanceof Error ? (e.stack ?? e.message) : String(e));
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
