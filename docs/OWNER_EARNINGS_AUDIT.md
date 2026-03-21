# Owner Earnings Dashboard – Audit & Redesign

## 1. Current Structure – What’s Wrong

### Overview
- **Too many metrics at once** – 8 cards with no clear hierarchy.
- **Mixed concepts** – "Total earned" (all-time) vs "This month" (gross) vs "You receive" (all-time net).
- **Terminology** – "You receive", "Rentals", "How busy" are vague.
- **Pending payout buried** – Important "money on the way" is below the fold.
- **No attention items** – Nothing highlights what needs action.

### Financial Logic
- **Flow not explained** – No visible path from gross → fees → net → paid out → pending.
- **Revenue vs net mixed** – `revenueThisMonth` is gross, `netEarnings` is all-time net.
- **Paid out unclear** – Payouts list exists but no clear "total paid out" summary.

### Missing Metrics
- Pending payout (exists but not primary)
- Total paid out
- Upcoming earnings (confirmed future bookings)
- Upcoming bookings count
- Cancellation rate
- Next payout date (if predictable)
- Best / worst performing car (derivable)

### Page Structure
- **Earnings & Payouts** – Combined but financial flow and payout history are separate concepts.
- **Analytics** – Revenue + cars + demand on one page; cars could be a standalone "Cars" page.
- **Map** – Top-level but low value for core earnings; better as secondary.

### Code
- Duplicated `formatMoney`, types, fetch logic across pages.
- No shared dashboard hooks or layout components.

---

## 2. Proposed Structure

### Sidebar
1. **Overview** – Primary KPIs only.
2. **Earnings** – Financial flow with period filter.
3. **Payouts** – Pending + history.
4. **Cars** – Per-car performance.
5. **Analytics** – Revenue over time + demand patterns.
6. **Map** – Secondary, bottom of nav.

### Page Contents

**A. Overview**
- Primary: Net earnings this month, Pending payout, Completed bookings, Occupancy rate.
- Secondary: Total net earnings, Avg per booking, Avg trip length, This year.
- Alert: Pending payout if > 0.
- Quick links to Earnings, Bookings.

**B. Earnings**
- Visual flow: Gross → Platform fee → Net.
- Period filter.
- "For accountant" expandable.
- CSV export.

**C. Payouts**
- Pending payout (prominent).
- Payout history (table).
- Total paid out.

**D. Cars**
- Per-car table: revenue, trips, occupancy, rating, avg length.
- Best / worst highlighted.
- Link to listing.

**E. Analytics**
- Revenue over time (chart).
- Demand by day of week, by month.
- Optional: trend vs previous period.

**F. Map**
- Pickup locations.
- Secondary, fewer visits.

---

## 3. Metrics – Keep, Move, Add

| Metric | Keep | Move | Add |
|--------|------|------|-----|
| Net earnings this month | ✓ Overview (primary) | | |
| Pending payout | ✓ Overview (primary) | | |
| Completed bookings | ✓ Overview (primary) | | |
| Occupancy rate | ✓ Overview (primary) | | |
| Total net earnings | ✓ Overview (secondary) | | |
| Avg per booking | ✓ Overview (secondary) | | |
| Avg trip length | ✓ Overview (secondary) | | |
| This year | ✓ Overview (secondary) | | |
| Gross revenue | | ✓ Earnings | |
| Platform fee | | ✓ Earnings | |
| Net (period) | | ✓ Earnings | |
| Paid out | | ✓ Payouts | ✓ Total paid out |
| Payout history | | ✓ Payouts | |
| Car performance | | ✓ Cars | |
| Best/worst car | | | ✓ Cars |
| Revenue over time | | ✓ Analytics | |
| Demand patterns | | ✓ Analytics | |
| Upcoming earnings | | | ✓ Overview (if data) |
| Upcoming bookings | | | ✓ Overview |
| Cancellation rate | | | ✓ Analytics (if useful) |

---

## 4. Terminology

| Old | New |
|-----|-----|
| You receive | Net earnings |
| Rentals | Completed bookings |
| How busy | Occupancy rate |
| Money on the way | Pending payout |
| Already paid out | Payout history |
| Renters paid | Gross revenue |
| Our fee | Platform fee |
| You get | Net earnings |
