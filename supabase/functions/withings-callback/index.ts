// Supabase Edge Function: "withings-callback"
// Withings redirects here after the user consents (?code&state). We exchange
// the code for tokens, store them for the user the `state` belongs to, and pull
// the last week of body measurements so data shows up immediately.
//
// Deploy with JWT verification DISABLED (Withings calls it, no login):
//   supabase functions deploy withings-callback --no-verify-jwt
// Secrets: WITHINGS_CLIENT_ID, WITHINGS_CLIENT_SECRET
import { createClient } from 'npm:@supabase/supabase-js@2';

const TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2';
const MEASURE_URL = 'https://wbsapi.withings.net/measure';

function page(message: string): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#FAF6F1;color:#3a3a3a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}
.card{background:#fff;border-radius:18px;padding:28px;max-width:340px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.08)}</style></head>
<body><div class="card"><p style="font-size:17px;line-height:1.5">${message}</p></div></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function dateInTz(ms: number, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

// Pull last 7 days of body composition and upsert into daily_logs.
async function pullMeasures(admin: any, userId: string, accessToken: string, tz: string) {
  const startdate = Math.floor((Date.now() - 7 * 86_400_000) / 1000);
  const res = await fetch(MEASURE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ action: 'getmeas', meastypes: '1,5,6', category: '1', startdate: String(startdate) }),
  });
  const data = await res.json();
  if (data.status !== 0) return;
  const grps = (data.body?.measuregrps ?? []).sort((a: any, b: any) => a.date - b.date);
  const byDate: Record<string, Record<string, number>> = {};
  for (const g of grps) {
    const date = dateInTz(g.date * 1000, tz);
    const rec = (byDate[date] ??= {});
    for (const m of g.measures ?? []) {
      const val = Math.round(m.value * Math.pow(10, m.unit) * 10) / 10;
      if (m.type === 1) rec.weight_kg = val;          // weight (kg)
      else if (m.type === 6) rec.body_fat_pct = val;  // fat ratio (%)
      else if (m.type === 5) rec.lean_mass_kg = val;  // fat-free (lean) mass (kg)
    }
  }
  for (const [date, rec] of Object.entries(byDate)) {
    if (Object.keys(rec).length === 0) continue;
    await admin.from('daily_logs').upsert({ user_id: userId, log_date: date, ...rec }, { onConflict: 'user_id,log_date' });
  }
}

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (!code || !state) return page('Missing code. Please start again from the app.');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: pending } = await admin.from('withings_pending').select('user_id').eq('state', state).maybeSingle();
    if (!pending) return page('This link expired. Please tap “Connect Withings” in the app again.');

    const clientId = Deno.env.get('WITHINGS_CLIENT_ID')!;
    const clientSecret = Deno.env.get('WITHINGS_CLIENT_SECRET')!;
    const redirectUri = `${supabaseUrl}/functions/v1/withings-callback`;

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        action: 'requesttoken',
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.status !== 0 || !tokenData.body?.access_token) {
      console.error('withings token exchange failed:', JSON.stringify(tokenData));
      return page('Withings authorization failed. Please try connecting again.');
    }
    const b = tokenData.body;
    const expiresAt = new Date(Date.now() + (b.expires_in - 60) * 1000).toISOString();
    await admin.from('withings_tokens').upsert(
      {
        user_id: pending.user_id,
        access_token: b.access_token,
        refresh_token: b.refresh_token,
        expires_at: expiresAt,
        withings_userid: String(b.userid ?? ''),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    await admin.from('withings_pending').delete().eq('state', state);

    // Best-effort immediate pull so the dashboard shows data right away.
    try {
      const { data: setting } = await admin.from('user_settings').select('timezone').eq('user_id', pending.user_id).maybeSingle();
      await pullMeasures(admin, pending.user_id, b.access_token, setting?.timezone || 'UTC');
    } catch (e) {
      console.error('withings initial pull failed:', e instanceof Error ? e.message : String(e));
    }

    return page('✅ Connected to Withings! Your weight, body fat and lean mass will sync automatically. You can close this page and go back to the app.');
  } catch (e) {
    console.error('withings-callback error:', e instanceof Error ? (e.stack ?? e.message) : String(e));
    return page('Something went wrong. Please try connecting again.');
  }
});
