/**
 * Email template registry.
 * Marketplace-grade transactional emails: hierarchy, readability, trust signals.
 * Each template returns { subject, html, text }.
 */

import type { EventType, NotificationEventPayload } from "../types";
import {
  emailLayout,
  getAppUrl,
  infoBlock,
  ctaButton,
} from "./layout";

export interface TemplateOutput {
  subject: string;
  html: string;
  text: string;
}

function bookingUrl(bookingId: string): string {
  return `${getAppUrl()}/bookings?highlight=${bookingId}`;
}

function carUrl(carId: string): string {
  return `${getAppUrl()}/rent-a-car/${carId}`;
}

export function renderEmailTemplate(
  eventType: EventType,
  payload: NotificationEventPayload,
  recipientRole: "owner" | "renter" | "user"
): TemplateOutput | null {
  const appUrl = getAppUrl();
  const carTitle = (payload.carTitle as string) ?? "your car";
  const amount = payload.amount != null ? `${payload.amount} ${payload.currency ?? "DKK"}` : "";
  const startDate = payload.startDate ?? "";
  const endDate = payload.endDate ?? "";
  const dateRange = startDate && endDate ? `${startDate} – ${endDate}` : startDate || endDate || "—";

  switch (eventType) {
    case "booking.requested": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const info = infoBlock([
        { label: "Car", value: carTitle },
        { label: "Dates", value: dateRange },
      ]);
      const content = `
        <h1 class="headline">New booking request</h1>
        <p class="body">Someone wants to rent your car. Review the request and approve or decline.</p>
        ${info}
        ${ctaButton(bookingLink, "View request")}
      `;
      return {
        subject: `New booking request for ${carTitle}`,
        html: emailLayout(content, "New booking request"),
        text: `New booking request for ${carTitle}.\nDates: ${dateRange}\n\nView request: ${bookingLink}`,
      };
    }

    case "booking.approved": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const info = infoBlock([
        { label: "Car", value: carTitle },
        { label: "Dates", value: dateRange },
      ]);
      const content = `
        <h1 class="headline">Booking approved – complete payment</h1>
        <p class="body">The owner has approved your booking. Complete your payment to confirm.</p>
        ${info}
        ${ctaButton(bookingLink, "Pay now")}
      `;
      return {
        subject: `Booking approved – complete payment for ${carTitle}`,
        html: emailLayout(content, "Booking approved"),
        text: `Your booking for ${carTitle} has been approved.\nDates: ${dateRange}\n\nComplete payment: ${bookingLink}`,
      };
    }

    case "booking.rejected": {
      const content = `
        <h1 class="headline">Booking request declined</h1>
        <p class="body">Unfortunately, your booking request for ${carTitle} (${dateRange}) was declined by the owner.</p>
        ${ctaButton(`${appUrl}/rent-a-car`, "Find another car")}
      `;
      return {
        subject: `Booking request declined for ${carTitle}`,
        html: emailLayout(content, "Booking declined"),
        text: `Your booking request for ${carTitle} was declined. Find another car: ${appUrl}/rent-a-car`,
      };
    }

    case "booking.confirmed": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const info = infoBlock([
        { label: "Car", value: carTitle },
        { label: "Dates", value: dateRange },
      ]);
      const content = `
        <h1 class="headline">Booking confirmed</h1>
        <p class="body">Your booking is confirmed. You’re all set for your trip.</p>
        ${info}
        ${ctaButton(bookingLink, "View booking")}
      `;
      return {
        subject: `Booking confirmed: ${carTitle}`,
        html: emailLayout(content, "Booking confirmed"),
        text: `Your booking for ${carTitle} is confirmed.\nDates: ${dateRange}\n\nView booking: ${bookingLink}`,
      };
    }

    case "booking.cancelled": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const content = `
        <h1 class="headline">Booking cancelled</h1>
        <p class="body">A booking for ${carTitle} (${dateRange}) has been cancelled.</p>
        ${ctaButton(bookingLink, "View details")}
      `;
      return {
        subject: `Booking cancelled: ${carTitle}`,
        html: emailLayout(content, "Booking cancelled"),
        text: `A booking for ${carTitle} has been cancelled.\n\nView details: ${bookingLink}`,
      };
    }

    case "booking.reminder": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const info = infoBlock([
        { label: "Car", value: carTitle },
        { label: "Start date", value: startDate },
      ]);
      const content = `
        <h1 class="headline">Upcoming trip</h1>
        <p class="body">Your rental starts soon. Here’s a quick reminder of your booking.</p>
        ${info}
        ${ctaButton(bookingLink, "View booking")}
      `;
      return {
        subject: `Reminder: ${carTitle} – trip starts ${startDate}`,
        html: emailLayout(content, "Trip reminder"),
        text: `Your rental for ${carTitle} starts on ${startDate}.\n\nView booking: ${bookingLink}`,
      };
    }

    case "payment.received": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const info = infoBlock([
        { label: "Amount", value: amount },
        { label: "Booking", value: carTitle },
      ]);
      const content = `
        <h1 class="headline">Payment received</h1>
        <p class="body">You’ve received a payment for a booking on ${carTitle}.</p>
        ${info}
        ${ctaButton(bookingLink, "View booking")}
      `;
      return {
        subject: `Payment received: ${amount}`,
        html: emailLayout(content, "Payment received"),
        text: `You received ${amount} for a booking on ${carTitle}.\n\nView booking: ${bookingLink}`,
      };
    }

    case "payment.receipt": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const info = infoBlock([
        { label: "Amount", value: amount },
        { label: "Car", value: carTitle },
      ]);
      const content = `
        <h1 class="headline">Payment confirmation</h1>
        <p class="body">Your payment has been confirmed. Your booking is secured.</p>
        ${info}
        ${ctaButton(bookingLink, "View booking")}
      `;
      return {
        subject: `Payment confirmation: ${carTitle}`,
        html: emailLayout(content, "Payment confirmation"),
        text: `Your payment of ${amount} for ${carTitle} is confirmed.\n\nView booking: ${bookingLink}`,
      };
    }

    case "payout.sent": {
      const info = infoBlock([{ label: "Amount", value: amount }]);
      const content = `
        <h1 class="headline">Payout sent</h1>
        <p class="body">A payout has been sent to your connected bank account. It may take a few business days to appear.</p>
        ${info}
        ${ctaButton(`${appUrl}/owner/dashboard`, "View dashboard")}
      `;
      return {
        subject: `Payout sent: ${amount}`,
        html: emailLayout(content, "Payout sent"),
        text: `Your payout of ${amount} has been sent.\n\nView dashboard: ${appUrl}/owner/dashboard`,
      };
    }

    case "payout.failed": {
      const info = infoBlock([{ label: "Amount", value: amount }]);
      const content = `
        <h1 class="headline">Payout failed</h1>
        <p class="body">We couldn’t process your payout. Please check your bank details in your account settings and try again.</p>
        ${info}
        ${ctaButton(`${appUrl}/owner/dashboard`, "Update bank details")}
      `;
      return {
        subject: `Payout failed: ${amount}`,
        html: emailLayout(content, "Payout failed"),
        text: `Your payout of ${amount} failed. Update bank details: ${appUrl}/owner/dashboard`,
      };
    }

    case "message.received": {
      const sender = (payload.senderName as string) ?? "Someone";
      const preview = (payload.messagePreview as string)?.slice(0, 100) ?? "New message";
      const ellipsis = (payload.messagePreview as string)?.length > 100 ? "…" : "";
      const convUrl = payload.conversationId
        ? `${appUrl}/bookings?conversation=${payload.conversationId}`
        : bookingUrl(payload.bookingId!);
      const content = `
        <h1 class="headline">New message from ${sender}</h1>
        <p class="body">You have a new message about a booking.</p>
        <div style="margin:20px 0;padding:16px;background:#f8fafc;border-radius:10px;border-left:4px solid #3F8F4F;">
          <p class="body body-muted" style="margin:0;font-style:italic;">"${preview}${ellipsis}"</p>
        </div>
        ${ctaButton(convUrl, "Reply")}
      `;
      return {
        subject: `New message from ${sender}`,
        html: emailLayout(content, "New message"),
        text: `${sender} sent you a message:\n\n"${preview}${ellipsis}"\n\nReply: ${convUrl}`,
      };
    }

    case "message.digest": {
      const sender = (payload.senderName as string) ?? "Someone";
      const unreadCount = (payload.unreadCount as number) ?? 1;
      const plural = unreadCount > 1 ? "s" : "";
      const convUrl = payload.conversationId
        ? `${appUrl}/bookings?conversation=${payload.conversationId}`
        : payload.bookingId
          ? bookingUrl(payload.bookingId)
          : `${appUrl}/bookings`;
      const content = `
        <h1 class="headline">${unreadCount} new message${plural} from ${sender}</h1>
        <p class="body">You have ${unreadCount} unread message${plural} in your conversation about a booking.</p>
        ${ctaButton(convUrl, "View messages")}
      `;
      return {
        subject: `${unreadCount} new message${plural} from ${sender}`,
        html: emailLayout(content, "New messages"),
        text: `You have ${unreadCount} new message${plural} from ${sender}. View: ${convUrl}`,
      };
    }

    case "review.requested": {
      const bookingLink = bookingUrl(payload.bookingId!);
      const info = infoBlock([{ label: "Car", value: carTitle }]);
      const content = `
        <h1 class="headline">How was your trip?</h1>
        <p class="body">Share your experience to help other travellers discover great cars.</p>
        ${info}
        ${ctaButton(bookingLink, "Leave a review")}
      `;
      return {
        subject: `Leave a review for ${carTitle}`,
        html: emailLayout(content, "Leave a review"),
        text: `How was your trip? Leave a review for ${carTitle}: ${bookingLink}`,
      };
    }

    case "user.welcome": {
      const content = `
        <h1 class="headline">Welcome to RentLocal</h1>
        <p class="body">Thanks for signing up! You can now browse cars, make bookings, and rent vehicles in the Faroe Islands.</p>
        ${ctaButton(`${appUrl}/rent-a-car`, "Browse cars")}
      `;
      return {
        subject: "Welcome to RentLocal",
        html: emailLayout(content, "Welcome"),
        text: "Welcome to RentLocal! Browse cars and start your rental: " + `${appUrl}/rent-a-car`,
      };
    }

    case "listing.published":
    case "renter.approved":
      return null;

    default:
      return null;
  }
}
