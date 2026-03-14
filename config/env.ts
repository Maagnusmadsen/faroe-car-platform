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

/** Base URL for the app (used for API client, auth callbacks, Stripe success/cancel). On Vercel, VERCEL_URL is set automatically. */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
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
};
