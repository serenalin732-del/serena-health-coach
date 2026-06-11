// Supabase Edge Function: "send-reminders"
// Invoked on a schedule (e.g. every 15 min via pg_cron). For each user whose
// local time matches an enabled reminder slot and who hasn't logged today, it
// sends a Web Push notification and/or an email.
//
// Deploy:
//   supabase functions deploy send-reminders --no-verify-jwt
//   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com
//   supabase secrets set RESEND_API_KEY=re_...            # optional, for email
//   supabase secrets set CRON_SECRET=<random>             # shared secret, see cron SQL
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Reminder slots → local hour (24h). Tweak to taste.
const SLOTS: { key: 'reminder_morning' | 'reminder_lunch' | 'reminder_evening'; hour: number; title: string; body: string }[] = [
  { key: 'reminder_morning', hour: 8, title: 'Morning check-in ☀️', body: 'Log your weight in a couple of taps to start the day.' },
  { key: 'reminder_lunch', hour: 13, title: 'Midday reminder 🍽️', body: 'How was lunch? Log your meal and protein.' },
  { key: 'reminder_evening', hour: 20, title: 'Evening check-in 🌙', body: 'Tick off today’s habits before bed.' },
];

function localHour(timezone: string): number {
  try {
    const s = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }).format(new Date());
    return parseInt(s, 10) % 24;
  } catch {
    return new Date().getUTCHours();
  }
}

Deno.serve(async (req: Request) => {
  // Shared-secret guard so only the scheduler can invoke this.
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('forbidden', { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';
  if (vapidPublic && vapidPrivate) {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  }
  const resendKey = Deno.env.get('RESEND_API_KEY');

  const { data: users } = await supabase
    .from('user_settings')
    .select('user_id, reminder_morning, reminder_lunch, reminder_evening, push_enabled, email_reminders, timezone, reminder_email');

  const today = new Date().toISOString().slice(0, 10);
  let sent = 0;

  for (const u of users ?? []) {
    const tz = u.timezone || 'UTC';
    const hour = localHour(tz);
    const slot = SLOTS.find((s) => s.hour === hour && u[s.key] !== false);
    if (!slot) continue;

    // Skip if they already logged something today.
    const { count } = await supabase
      .from('daily_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.user_id)
      .eq('log_date', today);
    if ((count ?? 0) > 0) continue;

    // Web Push
    if (u.push_enabled && vapidPublic && vapidPrivate) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', u.user_id);
      for (const s of subs ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: slot.title, body: slot.body, url: '/' })
          );
          sent++;
        } catch (err) {
          // 404/410 = expired subscription; clean it up.
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', s.id);
          }
        }
      }
    }

    // Email
    if (u.email_reminders && u.reminder_email && resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Serena Health Coach <reminders@resend.dev>',
            to: u.reminder_email,
            subject: slot.title,
            text: `${slot.body}\n\nOpen your check-in: https://serena-health-coach.pages.dev`,
          }),
        });
        sent++;
      } catch {
        // ignore individual email failures
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
