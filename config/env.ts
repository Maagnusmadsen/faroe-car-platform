/**
 * Environment variable access with optional validation.
 * Use this instead of process.env directly so we have a single place to document
 * and type env vars. Add runtime validation (e.g. Zod) in a later step if needed.
 */

function getEnv(key: string): string | undefined {
  return process.env[key];
}

function getEnvRequired(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/** Base URL for the app (used for API client, auth callbacks, Stripe success/cancel). Prefer APP_URL / NEXT_PUBLIC_APP_URL for prod. */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const appUrl = getEnv("APP_URL") ?? getEnv("NEXT_PUBLIC_APP_URL");
  if (appUrl) return appUrl.replace(/\/$/, "");
  const vercelUrl = getEnv("VERCEL_URL");
  if (vercelUrl) return `https://${vercelUrl}`;
  return getEnv("NEXTAUTH_URL") ?? "http://localhost:3000";
}

/** Only required when using DB (Step A1) */
export function getDatabaseUrl(): string {
  return getEnvRequired("DATABASE_URL");
}

/** Only required when using NextAuth (Step A2) */
export function getNextAuthSecret(): string {
  return getEnvRequired("NEXTAUTH_SECRET");
}

/** Optional; used by API client to point to same origin or external API */
export function getApiBaseUrl(): string {
  return getEnv("NEXT_PUBLIC_API_URL") ?? getBaseUrl();
}

/** Supabase (client-safe); required when using Supabase Auth/Storage */
export function getSupabaseUrl(): string | undefined {
  return getEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string | undefined {
  return getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/** Email/Resend config. Optional – notifications work without it (in-app only). */
export function getEmailFromAddress(): string {
  return getEnv("EMAIL_FROM_ADDRESS") ?? "notifications@rentlocal.fo";
}

export function getEmailFromName(): string {
  return getEnv("EMAIL_FROM_NAME") ?? "RentLocal";
}

export function getEmailReplyTo(): string | undefined {
  return getEnv("EMAIL_REPLY_TO");
}

export function getSupportEmail(): string {
  return getEnv("SUPPORT_EMAIL") ?? getEnv("NEXT_PUBLIC_SUPPORT_EMAIL") ?? "support@rentlocal.fo";
}

/** Super admin: only this user can delete other admins. Set SUPER_ADMIN_EMAIL or defaults to maagnusmadsen@gmail.com */
export function getSuperAdminEmail(): string {
  return getEnv("SUPER_ADMIN_EMAIL") ?? "maagnusmadsen@gmail.com";
}

export function getResendApiKey(): string | undefined {
  return getEnv("RESEND_API_KEY");
}

/** Inngest event key – required in production for sending events to Inngest Cloud. */
export function getInngestEventKey(): string | undefined {
  return getEnv("INNGEST_EVENT_KEY");
}

/** Inngest signing key – required in production for webhook verification. */
export function getInngestSigningKey(): string | undefined {
  return getEnv("INNGEST_SIGNING_KEY");
}

/** Validate Inngest config. In production, both keys are required. Throws if invalid. */
export function requireInngestConfig(): { eventKey: string; signingKey: string } {
  const isProd = getEnv("NODE_ENV") === "production";
  const eventKey = getInngestEventKey();
  const signingKey = getInngestSigningKey();
  if (isProd) {
    if (!eventKey?.trim()) {
      throw new Error(
        "INNGEST_EVENT_KEY is required in production. Add it in Vercel Environment Variables."
      );
    }
    if (!signingKey?.trim()) {
      throw new Error(
        "INNGEST_SIGNING_KEY is required in production. Add it in Vercel Environment Variables."
      );
    }
  }
  return { eventKey: eventKey ?? "", signingKey: signingKey ?? "" };
}

/** Validate Resend config when email delivery is attempted. In production, API key is required. */
export function requireResendForProduction(): void {
  const isProd = getEnv("NODE_ENV") === "production";
  const apiKey = getResendApiKey();
  if (isProd && (!apiKey || !apiKey.trim())) {
    throw new Error(
      "RESEND_API_KEY is required in production for email notifications. Add it in Vercel Environment Variables."
    );
  }
}

export const env = {
  nodeEnv: getEnv("NODE_ENV") ?? "development",
  isDev: (getEnv("NODE_ENV") ?? "development") === "development",
  isProd: getEnv("NODE_ENV") === "production",
  baseUrl: getBaseUrl,
  apiBaseUrl: getApiBaseUrl,
  databaseUrl: getEnv("DATABASE_URL"),
  nextAuthUrl: getEnv("NEXTAUTH_URL"),
  nextAuthSecret: getEnv("NEXTAUTH_SECRET"),
  stripeSecretKey: getEnv("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: getEnv("STRIPE_WEBHOOK_SECRET"),
  supabaseUrl: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  resendApiKey: getResendApiKey,
  emailFromAddress: getEmailFromAddress,
  emailFromName: getEmailFromName,
  emailReplyTo: getEmailReplyTo,
  supportEmail: getSupportEmail,
  superAdminEmail: getSuperAdminEmail,
  inngestEventKey: getInngestEventKey,
  inngestSigningKey: getInngestSigningKey,
  requireResendForProduction,
};
