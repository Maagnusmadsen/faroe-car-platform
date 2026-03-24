/**
 * Email template registry.
 * Notification-only: short copy, link-first, no message/conversation body in email.
 * Each template returns { subject, html, text }.
 */

import type { EventType, NotificationEventPayload } from "../types";
import { emailLayout, getAppUrl, ctaButton } from "./layout";

export interface TemplateOutput {
  subject: string;
  html: string;
  text: string;
}

function bookingUrl(bookingId: string): string {
  return `${getAppUrl()}/bookings?highlight=${bookingId}`;
}

export function renderEmailTemplate(
  eventType: EventType,
  payload: NotificationEventPayload,
  recipientRole: "owner" | "renter" | "user"
): TemplateOutput | null {
  void recipientRole;
  const appUrl = getAppUrl();
  const carTitle = (payload.carTitle as string) ?? "your car";
  const amount = payload.amount != null ? `${payload.amount} ${payload.currency ?? "DKK"}` : "";

  switch (eventType) {
    case "booking.requested": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const content = `
        <h1 class="headline">New booking request</h1>
        <p class="body">Someone wants to rent your car. Open RentLocal to approve or decline.</p>
        ${ctaButton(bookingLink, "View request")}
      `;
      return {
        subject: `New booking request: ${carTitle}`,
        html: emailLayout(content, "New booking request"),
        text: `New booking request for ${carTitle}.\n\nView in RentLocal: ${bookingLink}`,
      };
    }

    case "booking.approved": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const content = `
        <h1 class="headline">Booking approved</h1>
        <p class="body">Complete payment in RentLocal to confirm your trip.</p>
        ${ctaButton(bookingLink, "Pay now")}
      `;
      return {
        subject: `Complete payment: ${carTitle}`,
        html: emailLayout(content, "Booking approved"),
        text: `Your booking for ${carTitle} was approved. Pay in RentLocal: ${bookingLink}`,
      };
    }

    case "booking.rejected": {
      const content = `
        <h1 class="headline">Booking request declined</h1>
        <p class="body">The owner declined this request. You can search for other cars in RentLocal.</p>
        ${ctaButton(`${appUrl}/rent-a-car`, "Browse cars")}
      `;
      return {
        subject: `Booking request declined: ${carTitle}`,
        html: emailLayout(content, "Booking declined"),
        text: `Your booking request for ${carTitle} was declined. Browse cars: ${appUrl}/rent-a-car`,
      };
    }

    case "booking.confirmed": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const content = `
        <h1 class="headline">Booking confirmed</h1>
        <p class="body">Your rental is confirmed. See pickup details in RentLocal.</p>
        ${ctaButton(bookingLink, "View booking")}
      `;
      return {
        subject: `Booking confirmed: ${carTitle}`,
        html: emailLayout(content, "Booking confirmed"),
        text: `Your booking for ${carTitle} is confirmed.\n\nView booking: ${bookingLink}`,
      };
    }

    case "booking.cancelled": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const content = `
        <h1 class="headline">Booking cancelled</h1>
        <p class="body">A booking for ${carTitle} was cancelled. Open RentLocal for details.</p>
        ${ctaButton(bookingLink, "View details")}
      `;
      return {
        subject: `Booking cancelled: ${carTitle}`,
        html: emailLayout(content, "Booking cancelled"),
        text: `A booking for ${carTitle} was cancelled.\n\nDetails: ${bookingLink}`,
      };
    }

    case "booking.reminder": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const content = `
        <h1 class="headline">Trip reminder</h1>
        <p class="body">Your rental starts soon. Check times and pickup in RentLocal.</p>
        ${ctaButton(bookingLink, "View booking")}
      `;
      return {
        subject: `Reminder: ${carTitle}`,
        html: emailLayout(content, "Trip reminder"),
        text: `Reminder: your rental for ${carTitle} starts soon.\n\n${bookingLink}`,
      };
    }

    case "payment.received": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const content = `
        <h1 class="headline">Payment received</h1>
        <p class="body">A payment (${amount}) was received for a booking. Details are in RentLocal.</p>
        ${ctaButton(bookingLink, "View booking")}
      `;
      return {
        subject: `Payment received: ${amount}`,
        html: emailLayout(content, "Payment received"),
        text: `Payment received (${amount}). View in RentLocal: ${bookingLink}`,
      };
    }

    case "payment.receipt": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const content = `
        <h1 class="headline">Payment confirmed</h1>
        <p class="body">Your payment (${amount}) went through. Your booking is secured.</p>
        ${ctaButton(bookingLink, "View booking")}
      `;
      return {
        subject: `Payment confirmed: ${carTitle}`,
        html: emailLayout(content, "Payment confirmation"),
        text: `Payment of ${amount} for ${carTitle} is confirmed.\n\n${bookingLink}`,
      };
    }

    case "payout.sent": {
      const content = `
        <h1 class="headline">Payout sent</h1>
        <p class="body">A payout of ${amount} was sent to your bank. Full details are in RentLocal.</p>
        ${ctaButton(`${appUrl}/owner/dashboard`, "Open dashboard")}
      `;
      return {
        subject: `Payout sent: ${amount}`,
        html: emailLayout(content, "Payout sent"),
        text: `Payout of ${amount} sent. Dashboard: ${appUrl}/owner/dashboard`,
      };
    }

    case "payout.failed": {
      const content = `
        <h1 class="headline">Payout failed</h1>
        <p class="body">We could not send your payout. Update your bank details in RentLocal.</p>
        ${ctaButton(`${appUrl}/owner/dashboard`, "Update details")}
      `;
      return {
        subject: `Payout failed: ${amount}`,
        html: emailLayout(content, "Payout failed"),
        text: `Payout of ${amount} failed. Update details: ${appUrl}/owner/dashboard`,
      };
    }

    /** In-app only for live traffic; kept for admin preview of notification-style ping. */
    case "message.received": {
      const convUrl = payload.conversationId
        ? `${appUrl}/bookings?conversation=${payload.conversationId}`
        : bookingUrl(payload.bookingId!);
      const content = `
        <h1 class="headline">New message</h1>
        <p class="body">You have a new message in RentLocal. Open the app to read and reply.</p>
        ${ctaButton(convUrl, "View messages")}
      `;
      return {
        subject: "New message on RentLocal",
        html: emailLayout(content, "New message"),
        text: `You have a new message in RentLocal.\n\nOpen: ${convUrl}`,
      };
    }

    /** Digest emails disabled — no template sent. */
    case "message.digest":
      return null;

    case "review.requested": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const content = `
        <h1 class="headline">Leave a review</h1>
        <p class="body">How was your trip? Leave a review to help other travellers.</p>
        ${ctaButton(bookingLink, "Leave a review")}
      `;
      return {
        subject: `Review your trip: ${carTitle}`,
        html: emailLayout(content, "Leave a review"),
        text: `Leave a review for ${carTitle}: ${bookingLink}`,
      };
    }

    case "user.welcome": {
      const content = `
        <h1 class="headline">Welcome to RentLocal</h1>
        <p class="body">You're signed up. Browse cars and book your next trip in the app.</p>
        ${ctaButton(`${appUrl}/rent-a-car`, "Browse cars")}
      `;
      return {
        subject: "Welcome to RentLocal",
        html: emailLayout(content, "Welcome"),
        text: `Welcome to RentLocal. Browse cars: ${appUrl}/rent-a-car`,
      };
    }

    case "renter.approved": {
      const content = `
        <h1 class="headline">You're approved to rent</h1>
        <p class="body">Your licence is verified. You can request bookings in RentLocal.</p>
        ${ctaButton(`${appUrl}/rent-a-car`, "Browse cars")}
      `;
      return {
        subject: "You're approved to rent on RentLocal",
        html: emailLayout(content, "Renter approved"),
        text: `You're approved to rent. Browse cars: ${appUrl}/rent-a-car`,
      };
    }

    case "listing.published":
      return null;

    default:
      return null;
  }
}
