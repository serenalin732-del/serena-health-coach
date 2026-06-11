// Supabase Edge Function: "analyze-labs"
// Extracts lab values from a photo of a lab report (e.g. Labcorp), so the user
// doesn't have to read and type each number. OpenRouter (vision-capable),
// reusing OPENROUTER_API_KEY. Model = LAB_MODEL (default "openai/gpt-4o-mini").
//
// Labcorp / US reports are usually in US units; the app stores a fixed set of
// units, so the model converts to those and notes anything it converted.
//
// Deploy:  supabase functions deploy analyze-labs
// (No new secret needed if OPENROUTER_API_KEY is already set for `coach`.)
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM = `You read a photo of a medical lab report (e.g. Labcorp) and extract a fixed set of values.

Return values in THESE units, converting from the report's units if needed:
- cortisol: nmol/L
- vitamin_d (25-hydroxy): nmol/L   (if reported in ng/mL, multiply by 2.496)
- progesterone: ng/mL
- glucose (fasting): mg/dL
- hba1c: %
- cholesterol (total): mg/dL

Also read the collection/test date as YYYY-MM-DD if present.

Respond with ONLY a JSON object — no prose, no code fences. Use null for any value not present on the report:
{"test_date": string|null, "cortisol": number|null, "vitamin_d": number|null, "progesterone": number|null, "glucose": number|null, "hba1c": number|null, "cholesterol": number|null, "note": string}

Rules:
- Only report numbers you can actually read; never invent values. If unsure, use null.
- "note" is one short sentence listing any unit conversions you made (or "" if none).`;

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
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
    const { image } = body as { image?: string };
    if (!image) return json({ error: 'Add a photo of the report first.' }, 400);

    const model = Deno.env.get('LAB_MODEL') ?? 'openai/gpt-4o-mini';
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Health Coach Lab Analysis',
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract the lab values from this report.' },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? '';
    const parsed = parseJson(raw);

    const date =
      typeof parsed.test_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.test_date)
        ? parsed.test_date
        : null;

    return json({
      test_date: date,
      cortisol: num(parsed.cortisol),
      vitamin_d: num(parsed.vitamin_d),
      progesterone: num(parsed.progesterone),
      glucose: num(parsed.glucose),
      hba1c: num(parsed.hba1c),
      cholesterol: num(parsed.cholesterol),
      note: String(parsed.note ?? '').slice(0, 200),
    });
  } catch (e) {
    console.error('analyze-labs error:', e instanceof Error ? (e.stack ?? e.message) : String(e));
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
