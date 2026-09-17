# CV Deck

CV Deck is a Computer Village marketplace built with Next.js, Prisma, Neon PostgreSQL, NextAuth credentials authentication, and Flutterwave checkout.

## Included features

- Customer, vendor, recruiter, and administrator roles
- Marketplace search, filtering, pagination, product details, and verified reviews
- Persistent customer carts, checkout, Flutterwave hosted payment, and webhook verification
- Customer order tracking and vendor fulfillment workflow
- Direct messages, notifications, vendor verification, and role-based dashboards

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and replace every placeholder. Never commit `.env`.

3. Generate the Prisma client and apply the project migrations to your development database:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

   Open `http://localhost:3000`.

## Quality checks

Run these before deploying:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

To serve a completed production build locally:

```bash
npm start
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL pooled connection URL |
| `DIRECT_URL` | Direct PostgreSQL URL used by Prisma migrations |
| `NEXTAUTH_URL` | Public app URL, for example `https://app.example.com` |
| `NEXTAUTH_SECRET` | Long, randomly generated NextAuth secret |
| `FLW_SECRET_KEY` | Flutterwave test or live secret key |
| `FLW_WEBHOOK_SECRET_HASH` | Flutterwave webhook secret hash |

Use test Flutterwave credentials only in development. Configure live keys only in the production host’s encrypted environment settings.

## Flutterwave webhook

After deployment, set the Flutterwave webhook URL to:

```text
https://YOUR_DOMAIN/api/webhooks/flutterwave
```

Set the same webhook secret hash in Flutterwave and in `FLW_WEBHOOK_SECRET_HASH`. The webhook verifies transactions server-side before marking a payment successful and moving the order to Processing.

## Deployment checklist

1. Create a production Neon database and set `DATABASE_URL` and `DIRECT_URL` on the hosting provider.
2. Set all variables from `.env.example` in the hosting provider; do not upload the `.env` file.
3. Run `npx prisma migrate deploy` against the production database as part of the release process.
4. Confirm `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
5. Deploy, then set the Flutterwave callback/webhook configuration to the public HTTPS domain.
6. Make one sandbox payment and confirm the order becomes Processing before switching to Flutterwave live credentials.
