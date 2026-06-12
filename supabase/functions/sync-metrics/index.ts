// Supabase Edge Function: "sync-metrics"
// Receives body metrics from an iOS Shortcut (reading Apple Health, where
// Garmin / a smart scale / the phone write them) and upserts them into
// daily_logs for today. Companion to "sync-sleep".
//
// Auth: the same personal sync token (user_settings.sync_token) passed as
// ?token=... — no interactive login, so deploy with JWT verification DISABLED
// (dashboard: function → Details → turn off "Enforce JWT verification", or
// CLI: --no-verify-jwt).
//
// Usage (GET or POST) — send only the params you have, others are left as-is:
//   .../functions/v1/sync-metrics?token=XXXX&weight=58.4&body_fat=22&lean_mass=44&steps=8200&resting_hr=58&hrv=42
// Optional &date=YYYY-MM-DD (defaults to today in the user's timezone).
import { createClient } from 'npm:@supabase/supabase-js@2';

function todayIn(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const url = new URL(req.url);
    let params: Record<string, string> = Object.fromEntries(url.searchParams);
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      params = { ...body, ...params };
    }

    const token = (params.token ?? '').trim();
    if (!token || token.length < 16) return json({ error: 'Missing or invalid token' }, 401);

    const num = (v: unknown) => {
      const n = v != null ? parseFloat(String(v)) : NaN;
      return Number.isFinite(n) ? n : null;
    };
    const round1 = (n: number) => Math.round(n * 10) / 10;

    // Build the update from whichever metrics were sent; never overwrite a
    // column with a null, so a partial sync (e.g. weight only) is safe.
    const update: Record<string, number> = {};

    const weight = num(params.weight ?? params.weight_kg);
    if (weight != null && weight > 0) update.weight_kg = round1(weight);

    // Apple Health body fat can arrive as a fraction (0.22) or a percent (22).
    let bodyFat = num(params.body_fat ?? params.body_fat_pct);
    if (bodyFat != null && bodyFat > 0) {
      if (bodyFat <= 1) bodyFat *= 100;
      update.body_fat_pct = round1(bodyFat);
    }

    const leanMass = num(params.lean_mass ?? params.lean_mass_kg);
    if (leanMass != null && leanMass > 0) update.lean_mass_kg = round1(leanMass);

    const steps = num(params.steps);
    if (steps != null && steps >= 0) update.steps = Math.round(steps);

    const activeKcal = num(params.active_kcal ?? params.active_energy ?? params.calories);
    if (activeKcal != null && activeKcal >= 0) update.active_kcal = Math.round(activeKcal);

    const restingHr = num(params.resting_hr ?? params.rhr);
    if (restingHr != null && restingHr > 0) update.resting_hr = Math.round(restingHr);

    const hrv = num(params.hrv ?? params.hrv_ms);
    if (hrv != null && hrv > 0) update.hrv_ms = round1(hrv);

    if (Object.keys(update).length === 0) {
      return json(
        { error: 'Provide at least one of weight, body_fat, lean_mass, steps, active_kcal, resting_hr, hrv' },
        400
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: setting } = await supabase
      .from('user_settings')
      .select('user_id, timezone')
      .eq('sync_token', token)
      .maybeSingle();
    if (!setting) return json({ error: 'Unknown token' }, 401);

    const date =
      params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
        ? params.date
        : todayIn(setting.timezone || 'UTC');

    const { error } = await supabase
      .from('daily_logs')
      .upsert(
        { user_id: setting.user_id, log_date: date, ...update },
        { onConflict: 'user_id,log_date' }
      );
    if (error) throw error;

    return json({ ok: true, date, saved: update });
  } catch (e) {
    console.error('sync-metrics error:', e instanceof Error ? (e.stack ?? e.message) : String(e));
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
