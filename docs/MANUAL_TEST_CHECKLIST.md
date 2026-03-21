# Manual Test Checklist – Faroe Car Marketplace

Production-style end-to-end test plan for the car rental marketplace.

---

## 1. AUTH / USER TESTS

### 1.1 Signup
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| A1 | Sign up with new email, valid password | Account created; redirected to app; can access dashboards | Email validation fails; password rules unclear; redirect loop | **Critical** |
| A2 | Sign up with existing email | Clear error: "Email already in use" | Silent fail; misleading error | **Critical** |
| A3 | Sign up with weak/invalid password | Validation error before submit | Accepts weak password | **High** |

### 1.2 Login
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| A4 | Log in with correct credentials | Success; session established; redirect to home/dashboard | Stuck on login; wrong redirect | **Critical** |
| A5 | Log in with wrong password | Clear "Invalid credentials" error | Generic 500; no error shown | **Critical** |
| A6 | Log in with non-existent email | Same as wrong password | Different behavior than A5 | **High** |

### 1.3 Logout
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| A7 | Click logout | Session cleared; redirected to home; protected routes inaccessible | Session persists; 401 on next request | **Critical** |

### 1.4 Role access
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| A8 | As owner: visit /owner/dashboard | Access granted | 403; redirect to login | **Critical** |
| A9 | As renter (no listings): visit /owner/dashboard | Access or empty state | 403 if too strict | **High** |
| A10 | As admin: visit /admin | Access granted | 403 | **Critical** |
| A11 | As non-admin: visit /admin | 403 Forbidden | Access granted | **Critical** |

### 1.5 Owner vs renter vs admin
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| A12 | Owner creates listing | Can access listing wizard | Blocked; wrong nav | **Critical** |
| A13 | Renter without verification: tries to book | Blocked with clear message about verification | Silent fail; misleading error | **Critical** |
| A14 | Admin moderates listing | Can approve/reject listings | No moderate UI; wrong permissions | **High** |

---

## 2. LISTING TESTS

### 2.1 Create listing
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| L1 | Complete full listing wizard (all steps) | Draft created; can edit and publish | Step validation blocks; data loss | **Critical** |
| L2 | Create minimal listing (required fields only) | Draft with defaults (e.g. price 1) | 500; validation too strict | **High** |
| L3 | Save draft, leave, return | Data persisted; can continue | Data lost; wrong step | **High** |

### 2.2 Edit listing
| # | Action | Expected | Expected | Priority |
|---|--------|----------|----------|----------|
| L4 | Edit draft: change price, description | Changes saved | 500; stale data | **Critical** |
| L5 | Edit published listing | Can update; status unchanged or as designed | Blocks edit; wrong status | **High** |

### 2.3 Validation
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| L6 | Submit step 5 with price = 0 | Error: "Daily price must be greater than 0" | Accepts 0 | **Critical** |
| L7 | Submit step 5 with price = -10 | Same error | Accepts negative | **Critical** |
| L8 | Submit step 5 with empty price | Error or sensible default | Saves 0 | **Critical** |
| L9 | Submit step 1 with empty brand/model | Validation errors | Saves invalid data | **High** |

### 2.4 Invalid price handling
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| L10 | Try to publish with price 0 (if possible) | Blocked with validation error | Publishes; creates bad listing | **Critical** |
| L11 | PATCH /api/listings/[id] with pricePerDay: 0 | 400 "Daily price must be greater than 0" | Persists 0 | **Critical** |

### 2.5 Publish / deactivate
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| L12 | Publish draft (Stripe Connect connected) | Status → ACTIVE; visible in search | Stays draft; 500 | **Critical** |
| L13 | Publish without Stripe Connect | Error: must connect Stripe first | Publishes without payout setup | **Critical** |
| L14 | Admin sets listing to PAUSED/REJECTED | Status updated; not in search | Still visible; wrong status | **High** |

### 2.6 Visibility in marketplace
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| L15 | Search with dates: ACTIVE listing appears | Listed; no blocked/overlapping dates | Missing; wrong filters | **Critical** |
| L16 | Search: DRAFT/REJECTED listing | Not in results | Appears | **Critical** |
| L17 | Search: listing with blocked dates in range | Excluded | Included | **High** |

---

## 3. BOOKING TESTS

### 3.1 Valid booking
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| B1 | Renter (verified) books car for valid range | Booking created; status PENDING_APPROVAL | 500; wrong status | **Critical** |
| B2 | Owner approves booking | Status → PENDING_PAYMENT; renter can pay | Stuck; wrong status | **Critical** |
| B3 | Renter completes payment | Status → CONFIRMED; Payment SUCCEEDED | Stuck PENDING_PAYMENT | **Critical** |

### 3.2 Overlapping dates
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| B4 | Book dates that overlap existing CONFIRMED booking | Error: car not available | Double-booking | **Critical** |
| B5 | Two renters book same car simultaneously | One succeeds, one fails (no double-book) | Both succeed | **Critical** |

### 3.3 Blocked dates
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| B6 | Book range that includes owner-blocked date | Error or car excluded from search | Books blocked date | **Critical** |

### 3.4 Invalid date ranges
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| B7 | Book with endDate ≤ startDate | 400 "End date must be after start date" | Accepts; 500 | **Critical** |
| B8 | Book same-day (start = end) | Rejected | Accepts | **Critical** |
| B9 | Search cars with endDate < startDate | Validation error | Wrong results | **High** |

### 3.5 Same-day booking behavior
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| B10 | Attempt 1-night booking (e.g. Mar 10–11) | Accepted; 1 day | Rejected; wrong day count | **High** |
| B11 | Attempt same-day (Mar 10–Mar 10) | Rejected | Accepted | **Critical** |

### 3.6 Booking status changes
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| B12 | Owner rejects PENDING_APPROVAL | Status → REJECTED | Stuck; wrong flow | **High** |
| B13 | Renter cancels PENDING_PAYMENT | Status → CANCELLED | Blocked; wrong permissions | **High** |
| B14 | Owner marks CONFIRMED trip complete | Status → COMPLETED | Blocked | **High** |
| B15 | Try to change status of COMPLETED booking | 409 "Already completed" | Allows edit | **High** |

---

## 4. PAYMENT / STRIPE TESTS

### 4.1 Successful checkout
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| P1 | Click "Pay now" on PENDING_PAYMENT booking | Redirect to Stripe Checkout | 500; wrong URL | **Critical** |
| P2 | Complete payment with valid card | Redirect to success URL; booking CONFIRMED; Payment SUCCEEDED | Stuck; wrong status | **Critical** |
| P3 | Check Payment record | PENDING at checkout, SUCCEEDED after webhook | No record; wrong status | **Critical** |
| P4 | Check booking total vs platform fee + owner payout | totalPrice = platformFeeAmount + ownerPayoutAmount | Mismatch | **Critical** |

### 4.2 Failed payment
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| P5 | Use card that will decline (e.g. 4000000000000002) | Stripe declines; Payment → FAILED; booking stays PENDING_PAYMENT | Booking confirmed; Payment wrong status | **Critical** |
| P6 | Webhook payment_intent.payment_failed received | Payment updated to FAILED; 200 response | 500; no update | **Critical** |

### 4.3 Expired checkout session
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| P7 | Start checkout, close tab without paying | Webhook checkout.session.expired; Payment → CANCELLED | Payment stuck PENDING; booking wrong | **Critical** |
| P8 | Verify Stripe webhook includes checkout.session.expired | Event configured in Stripe Dashboard | Missing; expired sessions not handled | **Critical** |

### 4.4 Duplicate webhook event
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| P9 | Stripe sends same checkout.session.completed twice | Second delivery: 200; no duplicate booking update; no duplicate notifications | Double confirm; double notify | **Critical** |

### 4.5 Invalid / missing metadata
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| P10 | Webhook with missing bookingId (manual/simulated) | 400; Stripe does not retry | 500; endless retries | **Critical** |
| P11 | Webhook with non-existent bookingId | 400; clear log | 500; retries | **High** |

### 4.6 Payment consistency
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| P12 | Owner earnings page: total matches sum of bookings | Numbers consistent | Mismatch; rounding errors | **High** |
| P13 | Admin payments: platform fees sum correct | Matches booking data | Wrong totals | **High** |
| P14 | Renter bookings page: total paid matches booking | Correct amount shown | Wrong amount | **High** |

---

## 5. OWNER DASHBOARD TESTS

### 5.1 Earnings overview
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| O1 | Owner with completed bookings: view dashboard | Revenue, net earnings, counts shown | 500; wrong numbers | **Critical** |
| O2 | Owner with no bookings: view dashboard | Empty/zero state | 500; misleading data | **High** |

### 5.2 Payouts
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| O3 | Pending payout shown | Correct amount; currency | Wrong amount | **High** |
| O4 | Payout history (if any) | List of payouts; status | 500; missing data | **Medium** |

### 5.3 Analytics
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| O5 | Revenue over time chart | Data matches bookings | Wrong buckets; empty | **Medium** |
| O6 | Per-car performance | Revenue/utilization per car | Wrong aggregation | **Medium** |

### 5.4 Consistency of numbers
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| O7 | Gross revenue = sum(totalPrice) of completed | Exact match | Rounding drift | **High** |
| O8 | Net payout = sum(ownerPayoutAmount) | Exact match | Mismatch | **High** |

---

## 6. ADMIN TESTS

### 6.1 Dashboard
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| D1 | Admin views main dashboard | Totals: users, listings, bookings, revenue | 500; wrong numbers | **Critical** |
| D2 | Metrics are consistent | Revenue = platform fees + owner payouts | Mismatch | **High** |

### 6.2 Users
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| D3 | List users; search | Results; pagination | 500; no search | **High** |
| D4 | Approve pending renter | Status → VERIFIED | No update | **High** |

### 6.3 Listings
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| D5 | List all listings; filter by status | Correct list | Wrong filter | **High** |
| D6 | Moderate listing: approve/reject | Status updated | No effect | **High** |
| D7 | Try to activate listing with price 0 | Blocked: "Cannot activate listing: daily price must be greater than 0" | Activates | **Critical** |

### 6.4 Bookings
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| D8 | List bookings; filter by status | Correct list | Wrong data | **High** |
| D9 | Booking amounts: total, fee, payout | totalPrice = platformFee + ownerPayout | Mismatch | **High** |

### 6.5 Payments
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| D10 | Admin payments page: totals | Platform fees; owner payouts; consistent | Wrong sums | **High** |

### 6.6 Issues
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| D11 | Issues page: pending approvals, failed payouts, etc. | Counts and links work | 500; wrong counts | **Medium** |

### 6.7 Consistency of totals
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| D12 | Admin dashboard revenue = sum of completed booking totals | Match | Mismatch | **High** |
| D13 | Admin payments page = dashboard financial summary | Same numbers | Different | **High** |

---

## 7. MOBILE TESTS

### 7.1 Navbar
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| M1 | Mobile: navbar collapses to hamburger | Menu hidden; icon visible | Broken layout | **High** |
| M2 | Tap hamburger: menu expands | Links visible; usable | No open; overlap | **High** |

### 7.2 Menu behavior
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| M3 | Tap link: navigates; menu closes | Correct page; menu closed | Menu stays open; wrong page | **Medium** |
| M4 | Tap outside: menu closes | Menu closes | Stays open | **Medium** |

### 7.3 Responsiveness
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| M5 | Resize to mobile width | Layout adapts; no horizontal scroll | Broken; overflow | **High** |
| M6 | Car cards / search results on mobile | Readable; tap targets sized | Cramped; hard to tap | **High** |

### 7.4 CTA buttons
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| M7 | "Book now", "Pay now", "List your car" | Visible; tappable; correct action | Hidden; too small | **Critical** |

### 7.5 Footer
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| M8 | Footer on mobile | Visible; links work | Cut off; overlap | **Medium** |

---

## 8. EDGE CASES

### 8.1 Empty states
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| E1 | Renter with no bookings | Friendly empty state | Blank; error | **Medium** |
| E2 | Owner with no listings | Prompt to create | 500 | **Medium** |
| E3 | Search with no results | "No cars found" message | Blank; confusing | **Medium** |

### 8.2 No listings
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| E4 | Fresh marketplace: no listings | Empty search; no crash | 500; broken UI | **High** |

### 8.3 No bookings
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| E5 | Owner with 0 completed bookings | Earnings show 0; no crash | 500; wrong numbers | **High** |

### 8.4 Zero / invalid legacy data
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| E6 | Listing with pricePerDay = 0 (if exists) | Booking fails; or excluded from search | Allows 0 DKK checkout | **Critical** |
| E7 | Admin sees listing with invalid price | Warning or flag (if implemented) | Silent; activates | **Medium** |

### 8.5 Deleted booking before webhook
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| E8 | Booking deleted/cancelled; then checkout.session.completed arrives | Webhook returns 400; Stripe stops retrying | 500; endless retries | **Critical** |

### 8.6 No matching payment record
| # | Action | Expected | Could Go Wrong | Priority |
|---|--------|----------|----------------|----------|
| E9 | checkout.session.completed for booking (Payment not pre-created) | Upsert creates Payment; booking confirmed | 500; no Payment | **High** |

---

## QUICK REFERENCE

### Top 10 tests to run first

1. **A4** – Login with correct credentials  
2. **A7** – Logout  
3. **L1** – Create full listing  
4. **L6** – Price = 0 rejected  
5. **B1** – Create valid booking  
6. **B2** – Owner approves booking  
7. **P1** – Start checkout (redirect to Stripe)  
8. **P2** – Complete payment successfully  
9. **P9** – Duplicate webhook (idempotency)  
10. **B7** – endDate ≤ startDate rejected  

### Most critical payment / webhook tests

| Test | What it proves |
|------|----------------|
| **P2** | End-to-end payment flow works |
| **P5** | Failed payment does not confirm booking |
| **P7** | Expired checkout updates Payment to CANCELLED |
| **P9** | Duplicate events handled safely |
| **P10** | Invalid metadata returns 400 (no retries) |
| **E8** | Missing booking returns 400 (no retries) |

### Most likely areas for bugs

1. **Price validation** – Edge cases (0, negative, empty) in wizard vs API  
2. **Webhook ordering** – Expired vs completed arriving out of order  
3. **Renter verification** – Blocking unverified renters consistently  
4. **Financial consistency** – totalPrice = platformFee + ownerPayout across all views  
5. **Empty / zero states** – Dashboards and search with no data  
6. **Mobile navigation** – Hamburger menu and touch targets  
7. **Date range logic** – Overlaps, blocked dates, timezone edge cases  
8. **Stripe Connect** – Publish blocked without Connect; payout flow  

---

## Test Execution Notes

- Use Stripe test cards: `4242...` (success), `4000000000000002` (decline)  
- Use Stripe CLI for webhook forwarding during local tests  
- Confirm webhook secret and endpoint in Stripe Dashboard  
- Verify `checkout.session.expired` is in production webhook events  
