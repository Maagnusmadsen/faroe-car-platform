/**
 * Email notification channel.
 * Renders templates, sends via Resend, logs to EmailLog.
 */

import { prisma } from "@/db";
import type { EventType, NotificationEventPayload } from "../types";
import { renderEmailTemplate } from "../templates";
import { sendEmail } from "../providers/resend";

export interface SendEmailNotificationInput {
  userId: string;
  email: string;
  eventType: EventType;
  payload: NotificationEventPayload;
  deliveryId: string;
  recipientRole: "owner" | "renter" | "user";
}

export interface SendEmailNotificationResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  statusCode?: number | null;
  /** True when we found existing SENT in EmailLog (idempotency); do not increment attemptCount. */
  reconciled?: boolean;
}

/**
 * Sends an email notification. Idempotent: checks EmailLog for SENT before sending.
 * On retry after failure: updates existing EmailLog row instead of creating, avoiding unique constraint.
 */
export async function sendEmailNotification(
  input: SendEmailNotificationInput
): Promise<SendEmailNotificationResult> {
  const existingLog = await prisma.emailLog.findUnique({
    where: { deliveryId: input.deliveryId },
  });
  if (existingLog?.status === "SENT") {
    return {
      success: true,
      providerMessageId: existingLog.providerMessageId ?? undefined,
      reconciled: true,
    };
  }

  const template = renderEmailTemplate(
    input.eventType,
    input.payload,
    input.recipientRole
  );

  if (!template) {
    return {
      success: false,
      error: "template_missing",
      statusCode: null,
    };
  }

  const result = await sendEmail({
    to: input.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  const logData = {
    provider: "RESEND" as const,
    providerMessageId: result.messageId ?? null,
    toEmail: input.email,
    subject: template.subject,
    status: result.success ? "SENT" : "FAILED",
    statusCode: result.statusCode ?? null,
    ...(result.error && { rawResponse: { error: result.error } as object }),
    sentAt: result.success ? new Date() : null,
  };

  if (existingLog) {
    await prisma.emailLog.update({
      where: { deliveryId: input.deliveryId },
      data: logData,
    });
  } else {
    await prisma.emailLog.create({
      data: {
        deliveryId: input.deliveryId,
        ...logData,
      },
    });
  }

  return {
    success: result.success,
    providerMessageId: result.messageId,
    error: result.error,
    statusCode: result.statusCode,
  };
}

export function getRecipientRole(
  eventType: EventType,
  payload: NotificationEventPayload,
  userId: string
): "owner" | "renter" | "user" {
  if (payload.ownerId === userId) return "owner";
  if (payload.renterId === userId) return "renter";
  return "user";
}
