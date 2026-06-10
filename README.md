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
