import Stripe from "stripe";
import { env } from "@/config/env";

export function getStripeClient(): Stripe {
  const secretKey = env.stripeSecretKey;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(secretKey, {
    apiVersion: "2023-10-16",
  });
}

