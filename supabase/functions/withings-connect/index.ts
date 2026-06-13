// Supabase Edge Function: "withings-connect"
// Called by the signed-in app. Creates a one-time `state`, stores which user it
// belongs to, and returns the Withings authorization URL for the app to open.
// After the user consents, Withings redirects to the "withings-callback"
// function with ?code&state.
//
// Deploy:  supabase functions deploy withings-connect
// Secret:  supabase secrets set WITHINGS_CLIENT_ID=...
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const clientId = Deno.env.get('WITHINGS_CLIENT_ID');
    if (!clientId) return json({ code: 'not_configured' });

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const state = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await admin.from('withings_pending').insert({ state, user_id: user.id });

    const redirectUri = `${supabaseUrl}/functions/v1/withings-callback`;
    const authorizeUrl =
      `https://account.withings.com/oauth2_user/authorize2?response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&scope=user.metrics` +
      `&state=${state}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return json({ url: authorizeUrl });
  } catch (e) {
    console.error('withings-connect error:', e instanceof Error ? (e.stack ?? e.message) : String(e));
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
