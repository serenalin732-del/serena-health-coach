// Supabase Edge Function: "analyze-label"
// Reads a photo of a packaged food's nutrition label and returns the product
// name/brand + nutrition PER 100g, to save into the user's pantry. OpenRouter
// (vision), reusing OPENROUTER_API_KEY. Model = LABEL_MODEL (default gpt-4o-mini).
//
// Deploy:  supabase functions deploy analyze-label
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM = `You read a photo of a packaged food's nutrition label (and front of pack) and return its nutrition PER 100g (or per 100ml).

If the label only shows per-serving values, convert to per 100g using the serving size shown. Read the product name and brand from the packaging.

Respond with ONLY a JSON object — no prose, no code fences:
{"name": string, "brand": string, "calories_100": number, "protein_100": number, "carbs_100": number, "fat_100": number, "healthy_fat_100": number, "note": string}

Rules:
- All nutrition numbers are PER 100g, rounded to whole numbers.
- "fat_100" is total fat per 100g. "healthy_fat_100" is the unsaturated/healthy share (high for oily fish like sardines, olive oil, nuts, avocado; low for fried/saturated products). If the label lists saturated fat, healthy ≈ total − saturated.
- "name" short (e.g. "Sardines in olive oil"); "brand" the brand only (e.g. "Nuri"), or "" if unknown.
- "note" one short sentence (e.g. what serving size you converted from); "" if none.
- Only report numbers you can read; estimate per-100g sensibly if the label is partial. Never invent a product.`;

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const a = cleaned.indexOf('{');
    const b = cleaned.lastIndexOf('}');
    if (a >= 0 && b > a) return JSON.parse(cleaned.slice(a, b + 1));
    throw new Error('Model did not return JSON');
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) return json({ code: 'not_configured' });

    const body = await req.json().catch(() => ({}));
    const { image } = body as { image?: string };
    if (!image) return json({ error: 'Add a photo of the label first.' }, 400);

    const model = Deno.env.get('LABEL_MODEL') ?? 'openai/gpt-4o-mini';
    let parsed: Record<string, unknown> | null = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Health Coach Label' },
          body: JSON.stringify({
            model,
            max_tokens: 600,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: SYSTEM },
              { role: 'user', content: [{ type: 'text', text: 'Read this nutrition label and return per-100g nutrition.' }, { type: 'image_url', image_url: { url: image } }] },
            ],
          }),
        });
        if (!res.ok) { lastErr = new Error(`OpenRouter ${res.status}: ${await res.text()}`); continue; }
        const data = await res.json();
        const raw = data?.choices?.[0]?.message?.content ?? '';
        if (!raw) { lastErr = new Error('Empty response'); continue; }
        parsed = parseJson(raw);
        break;
      } catch (err) {
        lastErr = err;
      }
    }
    if (!parsed) throw lastErr ?? new Error('Could not read the label');

    return json({
      name: String(parsed.name ?? '').slice(0, 120),
      brand: String(parsed.brand ?? '').slice(0, 80),
      calories_100: num(parsed.calories_100),
      protein_100: num(parsed.protein_100),
      carbs_100: num(parsed.carbs_100),
      fat_100: num(parsed.fat_100),
      healthy_fat_100: num(parsed.healthy_fat_100),
      note: String(parsed.note ?? '').slice(0, 200),
    });
  } catch (e) {
    console.error('analyze-label error:', e instanceof Error ? (e.stack ?? e.message) : String(e));
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
