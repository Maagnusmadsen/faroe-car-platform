# Notification & Email System – Fuld Audit

**Formål:** Denne fil indeholder en komplet audit af notifikations- og mailsystemet. Brug den til at instruere en anden AI (fx ChatGPT) eller udvikler til at implementere rettelser.

**Projekt:** RentLocal – biludlejningsplatform for Færøerne  
**Stack:** Next.js, Supabase (auth), Resend (emails), Inngest (background jobs), Stripe (webhooks), Vercel (deployment)

---

## 1. Fuld flow-beskrivelse

### 1.1 Entry points

| Trigger | Fil | Event(s) | Awaited? |
|---------|-----|----------|----------|
| Opret booking | `lib/bookings-server.ts` | `booking.requested` | Ja |
| Stripe checkout.session.completed | `lib/stripe-webhook.ts` | `booking.confirmed`, `payment.received`, `payment.receipt` | Ja |
| Booking status ændres | `app/api/bookings/[id]/status/route.ts` | `booking.approved`, `booking.rejected`, `booking.cancelled`, `review.requested` | Ja |
| Ny besked | `lib/messaging-server.ts` | `message.received` | Ja |
| Payout oprettet | `lib/payouts-server.ts` | `payout.sent` | Ja |
| Bruger signup | `lib/supabase/sync-user.ts` | `user.welcome` | Ja |
| Renter godkendt | `app/api/admin/users/[id]/verification/route.ts` | `renter.approved` | Ja |
| Listing publiceret | `app/api/listings/[id]/publish/route.ts` | `listing.published` | Ja |

### 1.2 Flow-steps

```
1. dispatchNotificationEvent({ type, idempotencyKey, payload })  → lib/notifications/service.ts

2. Idempotency check: findUnique på idempotencyKey → hvis findes, return early

3. Opret NotificationEvent i DB

4. inngest.send({ name: "notification/dispatch", data: { eventId } })
   - Success: opdater event.enqueuedAt
   - Failure: opdater event.enqueueError, kør processNotificationEvent() sync som fallback
   - Hvis sync også fejler: log kun, ingen videre håndtering

5. Inngest job (async): processNotificationEventFn → processNotificationEvent(eventId)

6. Processor (lib/notifications/processor.ts):
   - Hent event
   - enrichPayload() – tilføj carTitle, dates, ownerId, renterId fra DB
   - resolveRecipients() – userIds fra payload + event type
   - getEventConfig() – kanaler (IN_APP, EMAIL)
   - For hver recipient × channel:
     - isChannelEnabledForUser() – spring over hvis disabled (undtagen critical)
     - message.received: shouldThrottleMessageEmail() – throttling
     - deliverInApp() eller deliverEmail()

7. Recovery (cron, hver 5. min): recoverFailedEnqueues, retryFailedDeliveries

8. Message digest (cron, hver 3. min): processMessageDigests
```

---

## 2. Identificerede svagheder (fuld liste)

### Event creation & idempotency

- Idempotency kun på key; ingen dedup ved næsten-identiske keys
- Ingen transaktion mellem create + enqueue – event kan oprettes men enqueue fejler

### Inngest

- `INNGEST_EVENT_KEY` og `INNGEST_SIGNING_KEY` nævnes ikke i `DEPLOYMENT_VERCEL.md`
- Inngest client har ingen eksplicit event key
- Én funktion per event – store payloads kan ramme Vercel timeout (10–60s)
- Lokalt: Inngest Dev Server. Prod: Inngest Cloud skal være konfigureret

### Recipient resolution

- Brugere filtreres på `deletedAt: null`
- Manglende `ownerId`/`renterId` i payload → 0 recipients
- `User.email` kan være null → EMAIL springes over med kun warning
- `booking.requested` kræver `payload.ownerId`

### Enrichment & templates

- `enrichPayload` henter fra DB – hvis booking/car slettet, kan det fejle
- `carTitle` fallback er "your car"
- `getAppUrl()` bruger `VERCEL_URL` – kan være preview-URL eller forkert i prod
- Logo `readFileSync` ved module load – kan fejle på Vercel

### Resend & email

- Ingen `RESEND_API_KEY` → alle emails fejler (men markeres retryable)
- Resend 4xx fejl markeres forkert som retryable i nogle tilfælde
- `renderEmailTemplate` returnerer null for ukendte typer → delivery FAILED
- `listing.published` har bevidst ingen email-template

### Stripe webhook

- Notification-fejl fanges i `.catch()` – webhook returnerer 200
- Hvis dispatchNotificationEvent fejler, logges kun; event kan være tabt

### Message throttling & digest

- `shouldThrottleMessageEmail` tjekker SENT, ikke SKIPPED
- Race mellem digest-cron og ny besked → mulig duplikat-email
- `message.digest` bypasser Inngest – køres inline i cron
- `sendOneDigest` idempotency via `lastTriggeredAt.getTime()` – millisekund-kollision mulig

### Error handling

- Sync fallback fejl logges kun – event forbliver med `enqueueError`
- `processNotificationEvent` throw → Inngest retrier 3x, derefter done
- Hvis `ensureConversationForBooking` eller `dispatchNotificationEvent` kaster i bookings-server → booking eksisterer men ejer får aldrig besked

### Miljø

- Local: Inngest Dev Server. Prod: Inngest Cloud
- `RESEND_API_KEY` er optional – emails fejler stille uden
- `VERCEL_URL` bruges til links – kan være forkert i prod
- Ingen eksplicit `APP_URL` / `NEXT_PUBLIC_APP_URL` for prod

### Data-konsistens

- `NotificationDelivery` oprettes PENDING før send – kan forblive PENDING ved crash
- `EmailLog` oprettes efter Resend-kald – hvis crash før commit, ingen audit
- Event oprettes før Inngest send – hvis crash, orphan event

---

## 3. Top 5 mest sandsynlige årsager til manglende emails

1. **Manglende eller forkert Inngest-opsætning i prod**  
   `INNGEST_EVENT_KEY` og `INNGEST_SIGNING_KEY` mangler muligvis i Vercel. Uden dem kan `inngest.send()` fejle eller events ikke nå Inngest Cloud.

2. **`RESEND_API_KEY` mangler eller er ugyldig**  
   Uden key returnerer Resend "not configured" – alle email-forsøg fejler (5 retries, derefter FAILED).

3. **Bruger har ingen email**  
   `User.email` kan være null (fx OAuth). EMAIL springes over med kun warning – ser ud som "email sendt ikke" uden tydelig fejl.

4. **Forkert base URL i prod**  
   `getBaseUrl()` bruger `VERCEL_URL`, som kan være preview-URL. Links i emails kan pege forkert eller blive blokeret som spam.

5. **Stripe webhook returnerer før arbejde er færdigt**  
   Koden bruger `await Promise.all(...).catch()`, så det er mindre sandsynligt. Men hvis noget ændres til fire-and-forget, kan notifications tabes.

---

## 4. Hvor emails kan fejle stille (silent failures)

| Scenario | Fil | Hvorfor stille |
|----------|-----|----------------|
| Bruger har ingen email | `processor.ts` ~385 | Kun warning, SKIPPED – ingen fejl til bruger |
| Resend ikke konfigureret | `providers/resend.ts` | Returnerer success: false, retries, ingen tydelig fejl |
| Ingen recipients (tom liste) | `processor.ts` ~334 | "No recipients resolved" log, return – ingen throw |
| Template returnerer null | `channels/email.ts` | "No email template" error, FAILED – logget, ikke til bruger |
| Event oprettet, Inngest fejler, sync fejler | `service.ts` | Begge fejler, event har enqueueError – ingen bruger-feedback |
| Preference slår email fra | `processor.ts` | SKIPPED – bruger ved måske ikke de har slået fra |
| Message throttled til digest | `processor.ts` | SKIPPED – afhænger af digest-cron |
| Digest-cron fejler | `message-batching.ts` | Pending digests sendes aldrig – ingen alert |
| Recovery-cron kører ikke | Inngest | Failed enqueues/deliveries forbliver |
| `ownerId`/`renterId` mangler i payload | `events.ts` | collectRecipientIds returnerer [] – ingen modtagere |

---

## 5. Hvor data-inkonsistens kan opstå

| Scenario | Fil | Inconsistency |
|----------|-----|---------------|
| Booking oprettet, notification thrower | `bookings-server.ts` | Booking + conversation eksisterer, ingen NotificationEvent |
| Stripe webhook processer, notifications fejler | `stripe-webhook.ts` | Payment opdateret, notifications aldrig sendt |
| Inngest job kører delvist | `processor.ts` | Nogle modtagere får besked, andre ikke |
| Race på NotificationDelivery | `processor.ts` | Concurrent runs kan give duplikater eller forkert status |
| EmailLog efter Resend, før DB commit | `channels/email.ts` | Email sendt, crash før commit – ingen EmailLog |
| enqueuedAt sættes ikke ved crash | `service.ts` | Event findes, Inngest får det aldrig – kun recovery kan rette |
| Digest + immediate send overlap | `message-batching.ts` | Bruger kan få begge |
| MessageDigestPending slettes før digest sendt | `message-batching.ts` | Digest springes over |
| Soft-deleted bruger stadig i recipients | `events.ts` | Emails til slettede brugere |
| Preference opdateret midt i processing | `preferences.ts` | Notification matcher muligvis ikke seneste preference |

---

## 6. Relevante filer i codebasen

| Fil | Rolle |
|-----|-------|
| `lib/notifications/service.ts` | dispatchNotificationEvent, idempotency, Inngest send, sync fallback |
| `lib/notifications/processor.ts` | processNotificationEvent, recipient resolution, deliverInApp, deliverEmail |
| `lib/notifications/events.ts` | Event config, collectRecipientIds, resolveRecipients |
| `lib/notifications/channels/email.ts` | sendEmailNotification, Resend-kald, EmailLog |
| `lib/notifications/channels/in-app.ts` | createInAppNotification |
| `lib/notifications/providers/resend.ts` | Resend client, sendEmail |
| `lib/notifications/templates/index.ts` | renderEmailTemplate |
| `lib/notifications/templates/layout.ts` | getAppUrl, emailLayout, logo |
| `lib/notifications/preferences.ts` | isChannelEnabledForUser |
| `lib/notifications/retry.ts` | MAX_DELIVERY_ATTEMPTS, nextRetryAt, isRetryableEmail, isRetryableInApp |
| `lib/notifications/recovery.ts` | recoverFailedEnqueues, retryFailedDeliveries |
| `lib/notifications/message-batching.ts` | shouldThrottleMessageEmail, processMessageDigests |
| `lib/inngest/client.ts` | Inngest client |
| `lib/inngest/functions/notifications.ts` | processNotificationEventFn, notificationRecoveryFn, messageDigestFn |
| `app/api/inngest/route.ts` | Inngest serve handler |
| `lib/stripe-webhook.ts` | handleStripeEvent, dispatch af booking.confirmed, payment.received, payment.receipt |
| `lib/bookings-server.ts` | createBookingWithAvailabilityCheck, dispatch af booking.requested |
| `lib/supabase/sync-user.ts` | dispatch af user.welcome |
| `config/env.ts` | getResendApiKey, getBaseUrl, getEmailFromAddress |

---

## 7. Instruktion til AI/udvikler

**Brug denne audit til at:**

1. Prioritere hvilke svagheder der skal rettes først (fx Top 5 root causes).
2. Foreslå konkrete ændringer i kode og konfiguration.
3. Tilføje logging, metrics eller alerts der gør fejl synlige.
4. Sikre at Inngest, Resend og base URL er korrekt konfigureret i production.
5. Reducere silent failures og data-inkonsistens.

**Start med:** Top 5 root causes (sektion 3) og de mest kritiske silent failures (sektion 4).
