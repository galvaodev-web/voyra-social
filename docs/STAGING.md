# Voyra staging gate

Use one dedicated Supabase staging project for Travel and Social, Stripe test mode, and two HTTPS hosts such as `staging.voyra.com` and `social-staging.voyra.com`. Never reuse production secrets or customer data.

## Provisioning order

1. Apply Travel `supabase/schema.sql`, then Travel migrations in filename order.
2. Apply Social migrations in filename order, ending with `202609170001_admin_moderation.sql`.
3. Expose the `social` schema in Supabase, keep RLS enabled, and verify all buckets remain private.
4. Register one staging user, then insert that UUID into `social.admin_users` through the SQL editor.
5. Configure both Vercel projects with the same Supabase project and `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.voyra.com` only when both staging hosts are subdomains of that domain.
6. Configure Travel Stripe test prices/webhook and set Social video uploads to `false`.

Run `npm run check:launch -- --remote` in both repositories. Deploy immutable commits to Vercel Preview/Staging before production promotion.

## Acceptance

- Register and confirm email; log in, refresh the session, log out and recover the password.
- Repeat with two accounts and prove that each cannot read the other's private trips, drafts, saves, notifications, documents or Storage objects.
- Open Travel and Social in separate tabs; verify shared login, refresh, logout and deep links in both directions.
- Search by budget, select a destination, confirm carried origin/budget/travelers/duration, and create the trip.
- Publish a sanitized trip, import Social content idempotently, complete a dated trip, issue one Passport and open its Recap.
- Upload JPEG/PNG/WebP and verify signed URLs; prove video is rejected even with a handcrafted request.
- Report post/comment/profile, then exercise dismiss, remove, warn, suspend and ban from `/admin`; inspect `moderation_actions`.
- Download the account export. In a disposable account, delete the ecosystem and verify Auth, database rows, Social media, Travel documents and Stripe test customer.
- Exercise Stripe checkout success/cancel/decline, portal, renewal, `past_due`, downgrade, cancellation, duplicate webhook and old webhook.
- Verify `/api/health` for both services and correlate a forced API error by `x-request-id`.

## Backup and rollback

Before every production migration, create a Supabase PITR/manual database backup and record the migration list, deployed commit SHAs and Stripe webhook configuration. Storage needs its own inventory/copy procedure; database backup does not contain object bytes.

For application rollback, redeploy the previous immutable Vercel commit. For database rollback, prefer a forward corrective migration. Restore a backup only for destructive incidents, first into an isolated project, validate row counts/RLS/storage references, then schedule the controlled cutover. Never reverse a migration by editing a file already applied.

After rollback, replay only idempotent Stripe webhooks/jobs, inspect account deletions and moderation actions, and document the incident before reopening writes.
