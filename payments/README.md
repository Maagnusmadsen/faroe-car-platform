# Payments

Payment and payout utilities. Used by booking and payout services (Step D10–D11).

**When to add here:**
- Stripe client and helpers (create payment intent, confirm, refund).
- Webhook signature verification.
- Payout/transfer to owner (Stripe Connect or manual).

Do not store card details; use Stripe (or similar) for PCI compliance.
