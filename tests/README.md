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

Webhook unit tests exercise both provider handlers with mocked verification
responses: invalid signatures, underpayment, wrong currency/reference, failed
payments, HTTP/API errors, network exceptions, duplicate order confirmations,
and successful order/campaign dispatch. They use fixture-only keys injected
into the loaded module, not local environment secrets. Network exceptions,
invalid provider JSON and timeouts must return 503 without finalization.
Timeout tests assert the 15-second deadline configuration, then accelerate the
abort signal to keep the test fast. Malformed signed payloads must return 400
before database access; string-valued amounts cannot confirm payment.
Flutterwave coverage follows the existing `verif-hash` handler and does not
resolve or validate the separate hosted-checkout issue.

Check results under GitHub Actions → Payment safety. A failing check does not
automatically prevent direct pushes or Vercel deployments. Requiring the
“Payment regression tests” status for merges needs a separate repository rule;
deployment gating needs separate Vercel configuration.

## Customer ownership checks

`payment-access.test.cjs` exercises both providers' initialize/verify handlers
with mocked sessions and Prisma. It asserts that queries use the authenticated
customer ID, not a supplied userId, and that inaccessible references return
without provider calls or writes. Order detail tests cover an unrelated customer
and the owner. This is not an exhaustive authorization audit or a real-session
end-to-end test.

Follow-up found during inspection: the order-status PUT handler includes the
full User relation in its response. Replace that with an explicit safe response
selection and test that password hashes and unrelated profile fields are never
returned. Vendor/admin response minimization remains unverified by these tests.

## PostgreSQL integration checks

The separate “PostgreSQL payment concurrency” CI job starts a disposable
PostgreSQL 16 service. `npm run test:payments:database` rejects execution unless
GitHub Actions is active and both database URLs point to the explicitly named
loopback test database. No production secrets are supplied.

The runner generates Prisma and applies the current schema to the fresh service
with `db push` (this does not test the migration chain). Tests execute the real
payment finalization helper and cancellation route using Prisma; authentication
and HTTP response construction are stubbed, not provider verification.

Checks cover simultaneous confirmations, cancellation-first, payment-first,
and five overlapping cancellation/payment attempts. They assert final order and
payment states, stock quantities, and buyer/vendor notification counts. The
overlap tests accept either valid winner; they do not guarantee every possible
database interleaving. GitHub destroys the service and fixtures after the job.
Never run test setup against the production Neon database.
