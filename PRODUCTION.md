# Voyra Social — Production runbook

Voyra Social is a server-rendered Next.js application. GitHub Pages is no longer the production target because authenticated feeds, uploads, Supabase sessions and the Travel adapter require a real server runtime.

## 1. Shared identity and database

Use the same Supabase project as Voyra Travel. Apply the Travel schema/migrations first, then run the Social migrations in filename order:

1. `supabase/migrations/202609110001_social.sql`
2. `supabase/migrations/202609110002_creator.sql`
3. `supabase/migrations/202609120003_growth.sql`
4. `supabase/seed.sql`

Expose the `social` schema through the Supabase Data API and keep RLS enabled.

## 2. Environment

Required production configuration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `NEXT_PUBLIC_SITE_URL=https://social.voyra.com`
- `NEXT_PUBLIC_TRAVEL_URL=https://voyra.com`
- `VOYRA_TRAVEL_API_URL=https://voyra.com`
- `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.voyra.com`

Use the cookie domain only after both products are HTTPS subdomains controlled by Voyra. Keep it empty during localhost development.

## 3. Storage

Keep `social-images`, `social-videos` and `avatars` private. Do not enable public bucket access. The current upload route validates the authenticated session, origin, declared MIME, binary signature and image decoding before finalizing a post.

For high-volume video, move transcoding, metadata stripping, poster generation and caption processing to a durable worker before opening unrestricted video uploads.

## 4. Product loop

Production is expected to support this end-to-end flow:

`Discover → add to Travel → travel → complete → Passport → Recap → share → new discovery`

Passport awards can only be issued from the authenticated Travel completion endpoint. The Social client cannot mint arbitrary destinations or travel history.

Public Recaps contain only the Passport-safe snapshot (destination, dates, duration and place count). Expenses, documents, members and private diary content are never part of the public artifact.

## 5. Validation

Run before deployment:

```bash
npm ci
npm run lint
npm test
npm run build
npm run test:e2e
```

The CI workflow runs lint, unit/RLS tests and the production build for release branches and pull requests. Remote Auth, SMTP, Storage and Social ↔ Travel flows still need staging credentials for end-to-end validation.
