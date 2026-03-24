/**
 * Resend email provider.
 * Abstraction so the provider can be swapped later.
 */

import { Resend } from "resend";
import { env } from "@/config/env";

let _client: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = env.resendApiKey();
  if (!apiKey) return null;
  if (!_client) _client = new Resend(apiKey);
  return _client;
}

/** Throws in production if RESEND_API_KEY is missing. Call before attempting email send. */
export function assertResendConfigured(): void {
  env.requireResendForProduction();
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  assertResendConfigured();
  const client = getResendClient();
  if (!client) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY is required for email delivery. Add it to Vercel Environment Variables."
      );
    }
    return {
      success: false,
      error: "provider_error: RESEND_API_KEY not configured (dev mode)",
      statusCode: undefined,
    };
  }

  try {
    const { data, error } = await client.emails.send({
      from: `${env.emailFromName()} <${env.emailFromAddress()}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo ?? env.emailReplyTo(),
    });

    if (error) {
      return {
        success: false,
        error: error.message,
        statusCode: (error as { statusCode?: number }).statusCode,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err) {
    const e = err as Error & { statusCode?: number };
    return {
      success: false,
      error: e.message,
      statusCode: e.statusCode,
    };
  }
}
