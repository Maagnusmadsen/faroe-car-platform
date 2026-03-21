# Admin Dashboard Audit & Redesign

## Current Issues

### 1. Dashboard lacks Action Center
- Issues are a single generic box, not actionable
- No severity indication (urgent vs warning)
- Pending payouts and pending listings buried
- Recent cancellations not surfaced as actionable

### 2. Poor information hierarchy
- Metrics scattered without clear grouping
- Overview mixes users, listings, bookings, revenue
- No primary vs secondary distinction
- Quick links redundant with sidebar

### 3. Missing metrics
- Active users (last 30 days)
- Growth vs previous period
- Cancellation rate % (exists in analytics, not dashboard)
- Average booking value
- Revenue last month for trend

### 4. Financial flow unclear
- Platform revenue vs fees vs owner payouts not visually connected
- No "this month" vs "last month" for trend

### 5. No performance trends on dashboard
- Revenue/booking charts only on Analytics page
- Admin must navigate away to understand growth

### 6. Listings performance not on dashboard
- Exists only on Analytics page
- Top/underperforming listings hidden

### 7. Users overview missing
- No new users, pending approvals summary on dashboard

### 8. Sidebar naming
- "Earnings" should be "Payments" (platform payments/payouts)
- No pickup map in admin (correct – focus on operations)

### 9. Sub-pages need improvements
- Users: no filter for role, verification status
- Listings: filters exist but labels (DRAFT vs "pending publish") unclear
- Bookings: no status or date filters
- Earnings: should be Payments, add payout status

---

## Proposed Structure

### Dashboard sections (in order)
1. **Action Center** – Issues with severity, clickable, first thing visible
2. **Platform Overview** – Total users, active users (30d), listings, active listings, total bookings
3. **Bookings Health** – Total, completed, upcoming, cancelled, cancellation rate %
4. **Revenue** – Gross → Platform fees → Owner payouts; this month + trend
5. **Performance Trends** – Revenue + bookings over time charts
6. **Listings Performance** – Top 10 table
7. **Users Overview** – New users 7d/30d, pending approvals, owners vs renters

### Sidebar
- Dashboard
- Users
- Listings
- Bookings
- Payments (renamed from Earnings)
- Analytics
- Issues

### Removed
- Quick links (redundant)
- Recent activity (low signal; could move to bottom or remove)
- Pickup map (not in admin – correct)
