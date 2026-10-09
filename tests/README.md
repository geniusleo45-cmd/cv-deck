# Payment safety checks

Run locally with Node 24 after installing dependencies:

```sh
npm run test:payments
```

The Payment safety GitHub Actions workflow runs on pushes to main, pull requests
targeting main, and manual dispatch. It installs locked dependencies without
lifecycle scripts, lints the test files, and runs the mocked regression tests.
It needs no database URL, provider credentials, or repository secrets.

Coverage includes payment finalization, duplicate confirmations, late payments
on cancelled orders, a simulated cancellation-before-claim sequence, and
admin-only review recording/validation/idempotency. Transaction rollback is
simulated by the test double, not verified against PostgreSQL.

These are unit tests, not real database concurrency tests, provider integration
tests, UI tests, or a production build. No real charge or refund is created.

Check results under GitHub Actions → Payment safety. A failing check does not
automatically prevent direct pushes or Vercel deployments. Requiring the
“Payment regression tests” status for merges needs a separate repository rule;
deployment gating needs separate Vercel configuration.

Next verification stage: a dedicated disposable PostgreSQL test database, with
concurrent callback/cancellation scenarios. Never run destructive test setup
against the production Neon database.
