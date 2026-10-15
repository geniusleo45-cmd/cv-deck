# Account recovery foundation

Public email delivery is deliberately disabled. Production and Vercel previews
return 503 for link creation and consumption, without querying account existence.
No mail provider is configured. No message is sent automatically on registration.
Existing users can sign in without email verification. Request/resend is available
under Account Profile Settings in local development.

## Isolated local preview

Use only disposable accounts in a local PostgreSQL database named
`cvdeck_account_dev`. Both DATABASE_URL and DIRECT_URL must point to this database
on localhost, 127.0.0.1 or ::1. Do not copy production customer data into it.
Set `ACCOUNT_EMAIL_PREVIEW=true` in local environment configuration and start
`npm run dev` with no VERCEL environment variable. Bind the development server to
loopback (for example `npm run dev -- --hostname 127.0.0.1`). Apply migrations to
that local database and create a disposable account through registration.

Open Forgot password on the login screen, or Email verification in Profile.
Submission displays an email preview containing the link; no external email or
log output is generated. Preview requests must have a matching loopback Origin.
Reset links expire in 30 minutes; verification links in 24 hours. Resends have a
60-second per-account/purpose cooldown and replace the previous token. Tokens
are random 256-bit values stored only as SHA-256 hashes, bound to email and purpose.
Links use URL fragments, removed after loading; GET never consumes a token.
Consumption and account updates share a transaction and an account lock.
Password reset increments the session version; the server session callback
rejects older JWTs. Existing versionless sessions remain valid at version zero.
Email verification does not grant vendor/recruiter approval or application rights.

## Deployment

Apply `20261015160000_account_recovery` using `prisma migrate deploy` before
deploying code that selects the new User fields. This is additive; existing users
start unverified with session version zero. Never reset a production database.
Generate Prisma client and run lint, TypeScript, build and `npm run test:accounts`.

## Before enabling public delivery

- Configure a verified sending identity/provider, trusted application URL and secrets.
- Replace the preview-only transport; never return tokens or links in public JSON.
- Add durable IP/account request limits and uniform responses/timing for unknown emails.
- Test delivery failures/retries, real mailbox delivery, expiry, races and provider behavior.
- Keep no-store and no-referrer protection; do not log token URLs or plaintext passwords.
- Decide registration verification reminders, email-change/reverification and retention.
- Rotate/remove any deployed demo accounts, especially the previously advertised admin
  credentials. Removing the demo panel does not rotate their passwords.

`test:accounts` uses mocks, not a real database or browser. End-to-end and real
PostgreSQL recovery concurrency tests are still needed before public enablement.
