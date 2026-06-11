# serena-health-coach
Personal health coaching app for fat loss, sleep tracking, hormone tracking and wellness analytics.

## Testing

```bash
npm test            # run the Jest suite
npm run test:watch  # watch mode
npm run test:coverage
```

## Deploying the web app to Cloudflare Pages

The Expo web export (`npm run build:web`) produces a static single-page app in
`dist/`, ready to host on [Cloudflare Pages](https://developers.cloudflare.com/pages/).
SPA routing is handled by `public/_redirects` (copied to `dist/_redirects` on export).

### Automatic deploys (GitHub Actions)

Pushes to `main` build and deploy automatically via
`.github/workflows/deploy.yml` (using `wrangler`, independent of Cloudflare's
Git integration). It requires four repository secrets under
**Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN` — token with **Account → Cloudflare Pages → Edit**
- `CLOUDFLARE_ACCOUNT_ID`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Manual deploy from the CLI

```bash
npm run build:web
npx wrangler pages deploy dist --project-name=serena-health-coach
```

Requires a Cloudflare API token + account ID (`wrangler login`, or the
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` env vars).

## Supabase backend (migrations + edge functions)

The app's backend lives in `supabase/`. Apply the schema and deploy the
functions with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase db push                       # apply migrations (incl. reminders)
supabase functions deploy coach
supabase functions deploy send-reminders --no-verify-jwt
```

### AI coaching (`coach`)

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Until the key is set the coaching card shows a friendly "not configured" state.

### Daily reminders (`send-reminders`) — push + email

1. **Generate a VAPID keypair** (one-time): `npx web-push generate-vapid-keys`
2. **Function secrets:**
   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com
   supabase secrets set RESEND_API_KEY=re_...        # optional — enables email
   supabase secrets set CRON_SECRET=$(openssl rand -hex 16)
   ```
3. **Client build secret** — add the *public* VAPID key as a GitHub Actions
   secret named `EXPO_PUBLIC_VAPID_PUBLIC_KEY` (it gets baked into the web build
   so the browser can subscribe), and reference it in `.github/workflows/deploy.yml`
   build env.
4. **Schedule it** (Supabase SQL editor, runs every 15 min):
   ```sql
   select cron.schedule('send-reminders', '*/15 * * * *', $$
     select net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
       headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<CRON_SECRET>'),
       body := '{}'::jsonb
     );
   $$);
   ```

> **iOS note:** web push on iOS requires the site be installed as a PWA
> (Share → *Add to Home Screen*, iOS 16.4+). Desktop Chrome/Edge and Android
> work once the service worker is registered and the VAPID key is set.
