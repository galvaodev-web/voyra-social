# Voyra Social — Production runbook

Voyra Social is a server-rendered Next.js application. GitHub Pages is no longer the production target because authenticated feeds, uploads, Supabase sessions and the Travel adapter require a real server runtime.

## 1. Shared identity and database

Use the same Supabase project as Voyra Travel. Apply the Travel schema/migrations first, then run the Social migrations in filename order:

1. `supabase/migrations/202609110001_social.sql`
2. `supabase/migrations/202609110002_creator.sql`
3. `supabase/migrations/202609120003_growth.sql`
4. `supabase/migrations/202609170001_admin_moderation.sql`
5. `supabase/migrations/202609180001_web_1_0.sql`
6. `supabase/seed.sql` (optional catalog/demo content; never production identities)

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
- `NEXT_PUBLIC_VIDEO_UPLOAD_ENABLED=false`
- `NEXT_PUBLIC_SUPPORT_EMAIL`

Use the cookie domain only after both products are HTTPS subdomains controlled by Voyra. Keep it empty during localhost development.

## 3. Storage

Keep `social-images`, `social-videos` and `avatars` private. Do not enable public bucket access. The current upload route validates the authenticated session, origin, declared MIME, binary signature and image decoding before finalizing a post.

Video is rejected by both UI and server while `NEXT_PUBLIC_VIDEO_UPLOAD_ENABLED=false`. Do not enable it until transcoding, metadata stripping, duration validation and poster generation run in a durable worker.

## Administration and account lifecycle

Create the first administrator only through a trusted SQL session after that person has registered:

```sql
insert into social.admin_users(user_id, role)
values ('AUTH-USER-UUID', 'ADMIN');
```

Never expose an admin-creation endpoint. `/admin` and `/api/admin/moderation` re-check the active role server-side. Actions are written to `social.moderation_actions`; suspensions and bans also synchronize Supabase Auth.

`GET /api/account/export` downloads the authenticated user's allowlisted Travel and Social data. Social delegates deletion to Travel's bearer-protected `/social/account`; the durable Travel job enumerates Social and Travel Storage, cancels Stripe and removes the shared Auth identity, and can be retried by cron.

## 4. Product loop

Production is expected to support this end-to-end flow:

`Discover → add to Travel → travel → complete → Passport → Recap → share → new discovery`

Passport awards can only be issued from the authenticated Travel completion endpoint. The Social client cannot mint arbitrary destinations or travel history.

Passport visibility is changed through `social.set_passport_visibility`, which atomically updates the Passport and linked Tokens. Direct authenticated updates to the visibility column are revoked.

Public Recaps contain only the Passport-safe snapshot (destination, dates, duration and place count). Expenses, documents, members and private diary content are never part of the public artifact.

## 5. Validation

Run before deployment:

```bash
npm ci
npm run lint
npm test
npm run build
npm run test:e2e
npm run check:launch
npm run check:launch -- --remote
```

Follow `docs/STAGING.md` before promotion. A GitHub Pages build is a static showcase, never the production application.

The CI workflow runs lint, unit/RLS tests and the production build for release branches and pull requests. Remote Auth, SMTP, Storage and Social ↔ Travel flows still need staging credentials for end-to-end validation.
