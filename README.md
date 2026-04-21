# LocalBite

LocalBite is a multi-tenant food ordering platform built with Next.js, Drizzle ORM, and Stripe.

## Local setup

1. **Install dependencies**
   ```bash
   npm ci
   ```
2. **Create environment file**
   ```bash
   cp .env.example .env.local
   ```
   If you do not have `.env.example`, create `.env.local` manually using the variables below.
3. **Run schema migrations**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
   For local SQLite development you can also use:
   ```bash
   npm run db:push
   ```
4. **Seed local data**
   ```bash
   npm run seed
   ```
5. **Start the app**
   ```bash
   npm run dev
   ```

## Environment variables

Create `.env.local` with the following:

```env
# Database
DATABASE_URL=file:./local.db
DATABASE_AUTH_TOKEN=

# Auth
AUTH_SECRET=<strong-random-secret>
NEXTAUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Optional AI menu import
ANTHROPIC_API_KEY=
```

### Notes on auth secrets

- Set `AUTH_SECRET` for NextAuth JWT/session signing.
- Keep auth secrets out of source control and rotate if leaked.

### Tenant host setup (subdomain routing)

The app resolves tenant context from subdomains (for example `goldenpanda.localhost`) and also supports `?tenant=` query fallback for local development.

Recommended local hosts entry:

```txt
127.0.0.1 goldenpanda.localhost
127.0.0.1 pizzanapoli.localhost
```

Then use URLs such as `http://goldenpanda.localhost:3000`.

## DB migration + seed workflow

### Standard Drizzle workflow

```bash
npm run db:generate
npm run db:migrate
npm run seed
```

### Fast local schema sync

```bash
npm run db:push
npm run seed
```

### Legacy/manual scripts (if needed)

There are ad-hoc scripts under `src/scripts` for backfills and one-off migrations (for example categories and order field migrations). Run them with `npx tsx <script-path>` only when needed.

## Development URLs

With the seed data:

- **Tenant customer app**: `http://goldenpanda.localhost:3000/`
- **Tenant kitchen board**: `http://goldenpanda.localhost:3000/kitchen`
- **Tenant admin**: `http://goldenpanda.localhost:3000/admin`
- **Superadmin**: `http://localhost:3000/superadmin`
- **Login**: `http://localhost:3000/login`

Fallback without hosts file:

- `http://localhost:3000/?tenant=goldenpanda`
- `http://localhost:3000/admin?tenant=goldenpanda`
- `http://localhost:3000/kitchen?tenant=goldenpanda`

## Deployment notes

### Subdomain routing

- Route wildcard subdomains to the same app deployment (for example `*.yourdomain.com` -> your Next.js app).
- Ensure your reverse proxy/load balancer forwards the original `Host` header.
- Do not reserve tenant names that conflict with platform subdomains (`www`, `app`, `superadmin`, `api`).

### Stripe webhook endpoint

- Configure Stripe webhook destination to:
  - `https://<your-domain>/api/stripe/webhook`
- Subscribe to at least `payment_intent.succeeded`.
- Set `STRIPE_WEBHOOK_SECRET` from Stripe in the deployment environment.
- If using Stripe CLI in local dev:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```

### Production env checklist

- Set all auth + Stripe env vars in your host provider.
- Set `NEXTAUTH_URL` to your public base URL.
- Confirm wildcard DNS and TLS certificate coverage for tenant subdomains.
