# Verifikation: Alle systemer for rentlocal.fo

Tjekliste for at sikre, at alle integrationer er korrekt sat op til https://rentlocal.fo.

---

## 1. Vercel – hosting

| Tjek | Handling |
|------|----------|
| [ ] rentlocal.fo viser **Valid Configuration** | Vercel → Project → Settings → Domains |
| [ ] rentlocal.fo er **Primary Domain** (anbefalet) | Samme sted |
| [ ] Hjemmesiden loader på https://rentlocal.fo | Åbn i browser |

---

## 2. Vercel – miljøvariabler

I **Project → Settings → Environment Variables** (Production):

| Variabel | Forventet værdi |
|----------|-----------------|
| `NEXTAUTH_URL` | `https://rentlocal.fo` |
| `NEXTAUTH_SECRET` | (hemmelig – samme som lokalt) |
| `RESEND_API_KEY` | `re_xxx` |
| `EMAIL_FROM_ADDRESS` | `notifications@rentlocal.fo` |
| `EMAIL_FROM_NAME` | `RentLocal` |
| `EMAIL_REPLY_TO` | `support@rentlocal.fo` |
| `INNGEST_SIGNING_KEY` | (fra Inngest Dashboard) |
| `DATABASE_URL` | (Supabase connection string) |
| `STRIPE_SECRET_KEY` | `sk_test_...` (eller `sk_live_...` i prod) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` |

**Valgfrit (men anbefalet):**
- `NEXT_PUBLIC_APP_URL` = `https://rentlocal.fo` (bruges til Open Graph/SEO-links)
- `NEXT_PUBLIC_SUPPORT_EMAIL` = `support@rentlocal.fo`
- `SHADOW_DATABASE_URL` = samme som DATABASE_URL (hvis build fejler)

---

## 3. Resend – email

| Tjek | Status |
|------|--------|
| Domæne rentlocal.fo verificeret i Resend | ✅ |
| DKIM, SPF, MX for `send` tilføjet | ✅ |
| API key i Vercel | ✅ |
| Afsender: notifications@rentlocal.fo | ✅ |

---

## 4. Inngest – baggrundsjobs

| Tjek | Status |
|------|--------|
| Vercel-integration installeret | ✅ |
| faroe-car-platform **enabled** | ✅ |
| Endpoint: /api/inngest | ✅ |

---

## 5. Stripe – betalinger

| Tjek | Handling |
|------|----------|
| [ ] Webhook endpoint | **Developers → Webhooks** → URL skal være `https://rentlocal.fo/api/stripe/webhook` |
| [ ] Webhook events | checkout.session.completed, payment_intent.payment_failed, osv. |
| [ ] STRIPE_WEBHOOK_SECRET i Vercel | Matcher webhookens signing secret |

---

## 6. Supabase – auth & database

| Tjek | Handling |
|------|----------|
| [ ] Site URL | **Authentication → URL Configuration** → `https://rentlocal.fo` |
| [ ] Redirect URLs | Inkluder `https://rentlocal.fo`, `https://rentlocal.fo/**`, `https://rentlocal.fo/auth/callback`, `https://rentlocal.fo/auth/verify` |
| [ ] Database connection | DATABASE_URL peger på Supabase pooler |

---

## 7. Kode – base URL

Appen bruger `getBaseUrl()` som afhænger af:
- `VERCEL_URL` (sættes automatisk af Vercel til deployment-URL)
- Eller `NEXTAUTH_URL` som fallback

**Anbefaling:** Sæt `NEXTAUTH_URL=https://rentlocal.fo` i Vercel Production, så Stripe success/cancel, auth callbacks og andre redirects bruger det rigtige domæne.

For **Open Graph / SEO** i bil-lister bruges `NEXT_PUBLIC_APP_URL` eller `VERCEL_URL`. Tilføj `NEXT_PUBLIC_APP_URL=https://rentlocal.fo` for at sikre korrekte delingslinks.

---

## 8. Hurtig end-to-end test

1. **Hjemmeside:** Åbn https://rentlocal.fo – loader siden?
2. **Login:** Log ind med Supabase – redirect til /auth/callback OK?
3. **Booking:** Lav en testbooking – bliver notifikation sendt?
4. **Mail:** Tjek at mail kommer fra notifications@rentlocal.fo
5. **Betaling (test):** Prøv Stripe test-checkout – success/cancel redirect til rentlocal.fo?

---

## Opsummering

| System | Status |
|--------|--------|
| Vercel (hosting) | Tjek domæne-config |
| Resend (email) | ✅ Konfigureret |
| Inngest (jobs) | ✅ Synkroniseret |
| Stripe (webhook) | ✅ rentlocal.fo |
| Supabase (auth) | Tjek redirect URLs |
| Env vars | Tjek NEXTAUTH_URL, evt. NEXT_PUBLIC_APP_URL |
