# Authentication hardening

The UI uses NextAuth credentials sign-in at `/api/auth`, not `/api/login`.
The unused legacy `/api/login` POST endpoint now returns 410 and never checks
credentials. External clients using it must switch to the supported `/login`
flow; it did not create a session previously.

Login input is checked before Prisma/bcrypt: valid email up to 254 characters,
password 1–4096 characters. Passwords and email case are not transformed.
Invalid inputs still appear as generic invalid credentials to users. This is
input validation, not rate limiting or a claim of constant-time authentication.

The hard-coded secret fallback is removed. NEXTAUTH_SECRET must be configured
with a private random value in production; NextAuth's production configuration
validation refuses to authenticate without a secret. Confirm its presence in
Vercel Production before deploying this change. Never share or commit its value.
No secret is generated or rotated by this change. If the previous fallback was
used, configure a new private secret and expect existing sessions to be signed out.

Credential/registration request throttling is documented in auth-rate-limits.md.
Still needed: broader role authorization audit and securing any existing demo accounts. Do not enable
public recovery email until its separate delivery and abuse safeguards are ready.
