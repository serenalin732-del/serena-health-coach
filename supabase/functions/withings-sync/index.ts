// Supabase Edge Function: "withings-sync"
// Runs on a schedule (pg_cron). For every connected user it refreshes the
// access token if needed, pulls the last week of body composition from Withings,
// and upserts weight / body fat % / lean mass into daily_logs.
//
// Deploy with JWT verification DISABLED (called by the scheduler):
//   supabase functions deploy withings-sync --no-verify-jwt
// Secrets: WITHINGS_CLIENT_ID, WITHINGS_CLIENT_SECRET, CRON_SECRET
import { createClient } from 'npm:@supabase/supabase-js@2';

const TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2';
const MEASURE_URL = 'https://wbsapi.withings.net/measure';

function dateInTz(ms: number, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('forbidden', { status: 403 });
  }

  const clientId = Deno.env.get('WITHINGS_CLIENT_ID');
  const clientSecret = Deno.env.get('WITHINGS_CLIENT_SECRET');
  if (!clientId || !clientSecret) return json({ code: 'not_configured' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: tokens } = await admin.from('withings_tokens').select('*');

  let synced = 0;
  for (const t of tokens ?? []) {
    try {
      let accessToken = t.access_token as string;

      // Refresh if expired or about to.
      if (new Date(t.expires_at).getTime() < Date.now() + 60_000) {
        const r = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'requesttoken',
            grant_type: 'refresh_token',
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: t.refresh_token,
          }),
        });
        const rd = await r.json();
        if (rd.status !== 0 || !rd.body?.access_token) {
          console.error('withings refresh failed for', t.user_id, JSON.stringify(rd));
          continue;
        }
        accessToken = rd.body.access_token;
        await admin
          .from('withings_tokens')
          .update({
            access_token: rd.body.access_token,
            refresh_token: rd.body.refresh_token,
            expires_at: new Date(Date.now() + (rd.body.expires_in - 60) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', t.user_id);
      }

      const { data: setting } = await admin.from('user_settings').select('timezone').eq('user_id', t.user_id).maybeSingle();
      const tz = setting?.timezone || 'UTC';

      const startdate = Math.floor((Date.now() - 7 * 86_400_000) / 1000);
      const mr = await fetch(MEASURE_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'getmeas', meastypes: '1,5,6', category: '1', startdate: String(startdate) }),
      });
      const md = await mr.json();
      if (md.status !== 0) {
        console.error('withings getmeas failed for', t.user_id, JSON.stringify(md));
        continue;
      }

      const grps = (md.body?.measuregrps ?? []).sort((a: any, b: any) => a.date - b.date);
      const byDate: Record<string, Record<string, number>> = {};
      for (const g of grps) {
        const date = dateInTz(g.date * 1000, tz);
        const rec = (byDate[date] ??= {});
        for (const m of g.measures ?? []) {
          const val = Math.round(m.value * Math.pow(10, m.unit) * 10) / 10;
          if (m.type === 1) rec.weight_kg = val;
          else if (m.type === 6) rec.body_fat_pct = val;
          else if (m.type === 5) rec.lean_mass_kg = val;
        }
      }
      for (const [date, rec] of Object.entries(byDate)) {
        if (Object.keys(rec).length === 0) continue;
        await admin.from('daily_logs').upsert({ user_id: t.user_id, log_date: date, ...rec }, { onConflict: 'user_id,log_date' });
        synced++;
      }
    } catch (e) {
      console.error('withings-sync user error:', t.user_id, e instanceof Error ? e.message : String(e));
    }
  }

  return json({ ok: true, users: (tokens ?? []).length, synced });
});
