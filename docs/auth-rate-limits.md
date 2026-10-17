# Authentication request limits

Shared PostgreSQL counters protect NextAuth credentials login and public
registration before password hashing or account lookup. All attempts, successful
or unsuccessful, count. No user record is permanently locked or modified.

| Scope | Attempts | Cooldown window |
| --- | --- | --- |
| Login / network address | 60 | 15 minutes |
| Login / email (case-insensitive bucket only) | 15 | 15 minutes |
| Registration / network address | 10 | 1 hour |
| Registration / email | 3 | 1 hour |

Windows start with the first request and expire automatically. Blocked requests
do not extend them. Counters survive restarts and use one atomic PostgreSQL
UPSERT, with saturated counts to avoid integer overflow. Email and address keys
are HMAC-SHA256 hashes keyed by NEXTAUTH_SECRET; raw identities are not stored.
Secret rotation resets the effective buckets, as well as existing auth sessions.

Vercel deployments use x-vercel-forwarded-for as described in the platform's
[request header documentation](https://vercel.com/docs/headers/request-headers).
Missing/invalid platform headers fail closed; arbitrary client-supplied forwarding
headers are not trusted on other hosts. Local development/test uses a shared
local bucket. Other production hosting needs an explicit trusted-proxy adapter.
IPv6 spelling is canonicalized, but rotating addresses or IPv6 prefixes are not
fully covered. Users sharing a public IP share a network quota.

Registration returns 429 with Retry-After. NextAuth communicates TooManyAttempts
through its credentials error flow; the login screen shows the cooldown message.
Unavailable limiter/database returns generic unavailable errors rather than
bypassing the protection. Existing authenticated sessions are not rate limited.

Apply migration 20261016160000_auth_rate_limits before deploying. The existing
authorized daily maintenance cron removes buckets expired more than one day ago;
configure CRON_SECRET and monitor that cron. Expiry itself never depends on cleanup.

Unit tests cover trust boundaries, key isolation, limits and fail-closed routes.
The disposable PostgreSQL CI job tests 75 concurrent requests against quota 60,
no cooldown extension, and restart after expiry. Never run it on customer data.
This does not replace edge DDoS protection, CAPTCHA/bot controls, monitoring or
future password recovery delivery limits. Email-wide limits can temporarily
affect a targeted user; monitor abuse and tune limits as real usage grows.
