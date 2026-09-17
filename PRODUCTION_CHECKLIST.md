# Voyra Social production checklist

- [ ] Apply Travel migrations first, then Social migrations through `202609180001_web_1_0.sql`.
- [ ] Expose the `social` schema while retaining every RLS policy and grant.
- [ ] Configure the same Supabase/Auth project as Travel and both HTTPS callback URLs.
- [ ] Set `VOYRA_TRAVEL_API_URL`, `NEXT_PUBLIC_TRAVEL_URL` and the shared cookie domain.
- [ ] Keep image, video and avatar buckets private; leave video upload disabled.
- [ ] Configure SMTP, support/privacy contacts and reviewed legal copy.
- [ ] Configure optional `SENTRY_DSN`; verify logs contain no tokens or private trip data.
- [ ] Run `npm ci`, lint, typecheck, tests, build and Playwright.
- [ ] Test onboarding, feed, add-to-trip, route import, Passport visibility, Recap and sharing.
- [ ] Test export and deletion with a disposable account across both products.
- [ ] Validate 375 px, 768 px and desktop layouts.
- [ ] Follow the shared Travel backup/restore runbook and record a tested restore.
