# Deploy FaroeRent to Vercel

Checklist for production deployment.

## 1. Environment variables

In Vercel: **Project → Settings → Environment Variables**. Add for **Production** (and Preview if you want):

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Supabase: Settings → Database → Connection string. Use **Transaction** (pooler) mode for serverless. |
| `SHADOW_DATABASE_URL` | Build only | Prisma schema expects it. Set to same as `DATABASE_URL` on Vercel if build fails with "env not found" (not used by `migrate deploy`). |
| `NEXTAUTH_SECRET` | Yes | Generate: `openssl rand -base64 32`. Keep secret. |
| `NEXTAUTH_URL` | Recommended | Your production URL, e.g. `https://your-app.vercel.app`. If unset, app uses `VERCEL_URL` (set by Vercel). |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://xxx.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key. |
| `STRIPE_SECRET_KEY` | Yes (payments) | Use **live** key (`sk_live_...`) in production. |
| `STRIPE_WEBHOOK_SECRET` | Yes (payments) | From Stripe **production** webhook (see below). |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Yes (maps) | Mapbox public token. |
| `UPLOAD_DRIVER` | Optional | `local` (ephemeral on Vercel), `supabase`, or `s3`. For production, use `supabase` or `s3`. |
| `SUPABASE_SERVICE_ROLE_KEY` | If Supabase storage | For server-side uploads; keep secret. |
| `SUPABASE_STORAGE_BUCKET` | If Supabase storage | Default `uploads`. |
| `INNGEST_EVENT_KEY` | Yes (notifications) | From Inngest Dashboard. Required in production for notification events. |
| `INNGEST_SIGNING_KEY` | Yes (notifications) | From Inngest Dashboard. Required for webhook verification. |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | Recommended | Production URL (e.g. `https://rentlocal.fo`). Used for email links. Fallback: VERCEL_URL. |
| `RESEND_API_KEY` | Yes (emails) | Resend API key. Required in production for email notifications. |
| `EMAIL_FROM_ADDRESS` | If using Resend | Sender email (e.g. `notifications@rentlocal.fo`). |
| `EMAIL_FROM_NAME` | Optional | Sender display name (default: RentLocal). |
| `EMAIL_REPLY_TO` | Optional | Reply-to address (e.g. `support@rentlocal.fo`). |
| `SUPPORT_EMAIL` / `NEXT_PUBLIC_SUPPORT_EMAIL` | Optional | Support contact in email footer. |
| `SUPER_ADMIN_EMAIL` | Optional | Email of super admin (only this user can delete other admins). Defaults to maagnusmadsen@gmail.com. |

Do **not** commit `.env` or `.env.local`. Use Vercel env UI only.

## 2. Supabase setup

1. **Database**  
   Use the same Supabase project (or a dedicated production project). Use the **pooler** connection string (port 5432, `pooler` in host) for serverless.

2. **Auth redirect URLs**  
   Supabase Dashboard → **Authentication** → **URL Configuration**:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: add `https://your-app.vercel.app/**` and `https://your-app.vercel.app/auth/callback`

3. **Email**  
   For sign-up confirmation emails in production, configure SMTP in Supabase (Auth → Email) or disable “Confirm email” if you don’t need it.

## 3. Stripe webhooks (production)

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL**: `https://your-app.vercel.app/api/stripe/webhook`
3. **Events**: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`, `account.updated` (if using Connect).
4. Create the endpoint and copy the **Signing secret** (`whsec_...`).
5. In Vercel, set `STRIPE_WEBHOOK_SECRET` to that signing secret.
6. Use **live** API keys in production (`sk_live_...`, `pk_live_...`). Set `STRIPE_SECRET_KEY`; publishable key is only needed if the client uses it (e.g. Elements).

## 4. Production configuration

- **Build**: The project runs `prisma generate && prisma migrate deploy && next build`. Migrations are applied at build time; ensure `DATABASE_URL` is set in Vercel.
- **Base URL**: Prefer `APP_URL` or `NEXT_PUBLIC_APP_URL` (e.g. `https://rentlocal.fo`) for correct email links. Fallback: `VERCEL_URL`, `NEXTAUTH_URL`.
- **Images**: `next.config.ts` allows images from `images.unsplash.com` and `**.supabase.co` (Supabase Storage). If you use another image host, add it to `remotePatterns`.

## 5. Deploy

1. Push to GitHub and connect the repo in Vercel.
2. Set all environment variables (step 1).
3. Deploy. The first build will run migrations; later builds will apply new migrations automatically.
4. After deploy, test login, a booking flow, and (if enabled) a test payment and webhook.

## Optional: Preview / staging

- Use a separate Supabase project or schema for preview deployments if you want isolated data.
- Use Stripe test keys and a separate webhook endpoint for preview (e.g. Stripe CLI forward to a preview URL) or leave webhooks disabled for preview.
