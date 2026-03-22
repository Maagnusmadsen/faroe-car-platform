# Phase D: Transactional Email Template UX Improvements

## 1. Recommended Template UX Approach

**Design principles (marketplace-grade, Airbnb/Booking/Turo-style):**

1. **Clear hierarchy**: H1 headline → supporting copy → info block → CTA. Scannable at a glance.
2. **Info blocks**: Transactional data (dates, amounts, car name) in a structured table/card so key details stand out.
3. **Prominent CTAs**: Single primary action per email; min 48px height for touch; brand color.
4. **Trust signals**: Header tagline ("Secure peer-to-peer · Faroe Islands"), support link, copyright.
5. **Mobile-first**: Fluid layout, viewport meta, responsive padding; no fixed widths for content.
6. **Consistency**: Same layout and components across all templates; brand colors (#3F8F4F).
7. **Plain text fallbacks**: Every template keeps a `text` field for non-HTML clients.

**Layout structure:**
- Header: Logo + trust tagline
- Content: Headline, body paragraph, optional info block, CTA
- Footer: Copyright, support link, visit site link

---

## 2. Files Added / Changed

| File | Change |
|------|--------|
| `lib/notifications/templates/layout.ts` | Redesign: trust bar, `infoBlock()`, `ctaButton()`, `secondaryLink()`, improved typography and spacing |
| `lib/notifications/templates/index.ts` | Use new layout; add info blocks to booking/payment templates; improve copy and hierarchy |
| `docs/notifications-phase-d.md` | This doc |

---

## 3. Implementation Summary

### 3.1 Layout (`layout.ts`)

- **Trust bar**: "Secure peer-to-peer · Faroe Islands" below logo.
- **`infoBlock(rows)`**: Renders key-value rows in a bordered table for transactional data.
- **`ctaButton(href, label)`**: Primary button; min 48px height; brand green.
- **`secondaryLink(href, label)`**: Subtle link for secondary actions (exported, not yet used).
- **Typography**: `.headline` (22px), `.body` (16px), `.body-muted` (15px).
- **Mobile**: Media query reduces padding and headline size on narrow viewports.

### 3.2 Templates (`index.ts`)

All transactional templates updated to use:
- Consistent structure (headline → body → info block when applicable → CTA)
- `infoBlock()` for booking dates, amounts, car name
- `ctaButton()` for primary actions
- Preserved plain text fallbacks

---

## 4. Manual Review Checklist

- [ ] **Layout**
  - [ ] Logo and trust bar render correctly
  - [ ] Footer shows support link and visit link
  - [ ] Mobile: resize to ~375px width; content readable, no horizontal scroll

- [ ] **booking.requested**
  - [ ] Info block shows car and dates
  - [ ] "View request" CTA links to correct booking

- [ ] **booking.approved**
  - [ ] Info block shows car and dates
  - [ ] "Pay now" CTA links to correct booking

- [ ] **booking.rejected**
  - [ ] "Find another car" CTA links to /rent-a-car

- [ ] **booking.confirmed**
  - [ ] Info block shows car and dates
  - [ ] "View booking" CTA works

- [ ] **booking.cancelled**
  - [ ] "View details" CTA works

- [ ] **booking.reminder**
  - [ ] Info block shows car and start date
  - [ ] "View booking" CTA works

- [ ] **payment.received**
  - [ ] Info block shows amount and booking
  - [ ] "View booking" CTA works

- [ ] **payment.receipt**
  - [ ] Info block shows amount and car
  - [ ] "View booking" CTA works

- [ ] **payout.sent**
  - [ ] Info block shows amount
  - [ ] "View dashboard" CTA works

- [ ] **payout.failed**
  - [ ] Info block shows amount
  - [ ] "Update bank details" CTA works

- [ ] **message.received**
  - [ ] Message preview renders in styled block
  - [ ] "Reply" CTA links to conversation

- [ ] **review.requested**
  - [ ] Info block shows car
  - [ ] "Leave a review" CTA works

- [ ] **Plain text**
  - [ ] Each template sends valid `text`; test with a text-only client or by inspecting `sendEmail` payload

- [ ] **Env-based URLs**
  - [ ] Links use `getAppUrl()` / `env.baseUrl()` (no hardcoded localhost in prod)
  - [ ] Support email from `env.supportEmail()`

---

## 5. Templates Upgraded First (and Why)

**Priority order used:**

1. **booking.requested** – Highest impact; owner must act quickly.
2. **booking.approved** – Renter needs to complete payment.
3. **booking.confirmed** – Confirmation builds trust.
4. **message.received** – Frequent; drives engagement.
5. **payment.received** – Money-related; clarity and trust matter.
6. **payment.receipt** – Same as above.
7. **booking.reminder** – Trip prep; clear dates help.
8. **booking.rejected**, **booking.cancelled** – Softer tone, clear next step.
9. **payout.sent**, **payout.failed** – Owner-facing; structured amount display.
10. **review.requested** – Engagement; clear CTA.

All templates were upgraded in one pass for consistency. The layout change affects every template; the info block and CTA patterns were applied wherever transactional data (dates, amounts, car) is relevant.
