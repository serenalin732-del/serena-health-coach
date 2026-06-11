// Supabase Edge Function: "sync-sleep"
// Receives last night's sleep from an iOS Shortcut (which reads Garmin data
// synced into Apple Health) and upserts it into sleep_logs.
//
// Auth: a personal sync token (user_settings.sync_token) passed as ?token=...
// — no interactive login, so this function must be deployed with JWT
// verification DISABLED (dashboard: function → Details → turn off
// "Enforce JWT verification", or CLI: --no-verify-jwt).
//
// Usage (GET or POST):
//   .../functions/v1/sync-sleep?token=XXXX&seconds=27000
//   .../functions/v1/sync-sleep?token=XXXX&minutes=432
//   .../functions/v1/sync-sleep?token=XXXX&hours=7.2
//   .../functions/v1/sync-sleep?token=XXXX&value=27000   (auto-detect unit)
// Optional &date=YYYY-MM-DD (defaults to today in the user's timezone — the
// morning after the night, matching the app's "Last Night" display).
import { createClient } from 'npm:@supabase/supabase-js@2';

function todayIn(timezone: string): string {
  try {
    // en-CA renders as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// Apple's "Calculate Statistics → Sum of Duration" returns SECONDS, but a
// person might also wire up minutes or hours. Rather than force the Shortcut to
// convert, infer the unit from the raw magnitude of a night's sleep:
//   ≤ 24       → already hours      (e.g. 7.5)
//   ≤ 1440     → minutes            (e.g. 450  → 7.5h)
//   otherwise  → seconds            (e.g. 27000 → 7.5h)
function toHours(n: number): number {
  if (n <= 24) return n;
  if (n <= 1440) return n / 60;
  return n / 3600;
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

    // Accept an explicit unit if given; otherwise auto-detect from magnitude so
    // the Shortcut never has to do unit math. `value`/`duration` are aliases for
    // the auto-detected case (Apple's "Sum of Duration" is seconds).
    const num = (v: unknown) => (v != null ? parseFloat(String(v)) : NaN);
    const hoursIn = num(params.hours);
    const minutesIn = num(params.minutes);
    const secondsIn = num(params.seconds);
    const autoIn = num(params.value ?? params.duration ?? params.minutes ?? params.seconds);

    let hours: number;
    if (Number.isFinite(hoursIn)) hours = hoursIn;
    else if (Number.isFinite(secondsIn)) hours = secondsIn / 3600;
    else if (Number.isFinite(minutesIn)) hours = toHours(minutesIn);
    else if (Number.isFinite(autoIn)) hours = toHours(autoIn);
    else hours = NaN;

    if (!Number.isFinite(hours) || hours <= 0) {
      return json({ error: 'Provide hours=, minutes=, seconds= or value= with a positive number' }, 400);
    }
    hours = Math.min(24, Math.round(hours * 10) / 10);

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
      .from('sleep_logs')
      .upsert(
        { user_id: setting.user_id, log_date: date, hours, notes: 'Synced from device' },
        { onConflict: 'user_id,log_date' }
      );
    if (error) throw error;

    return json({ ok: true, date, hours });
  } catch (e) {
    console.error('sync-sleep error:', e instanceof Error ? (e.stack ?? e.message) : String(e));
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
