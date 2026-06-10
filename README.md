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
Config lives in `wrangler.toml`; SPA routing is handled by `public/_redirects`
(copied to `dist/_redirects` on export).

### Option A — Connect the Git repo (recommended)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**, and pick this repository.
2. Set the build configuration:
   - **Build command:** `npm run build:web`
   - **Build output directory:** `dist`
   - **Node version:** picked up automatically from `.nvmrc` (22)
3. Add your runtime env vars under **Settings → Environment variables**:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Pushes to the production branch redeploy automatically.

### Option B — Deploy from the CLI

```bash
npm run build:web
npx wrangler pages deploy dist
```

Requires a Cloudflare API token + account ID (`wrangler login`, or the
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` env vars).
