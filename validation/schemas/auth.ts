/**
 * Auth request validation (sign up, etc.).
 */

import { z } from "zod";

const MIN_PASSWORD_LENGTH = 8;

export const signUpSchema = z.object({
  email: z.string().email("Invalid email").transform((s) => s.trim().toLowerCase()),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`),
  name: z.string().min(1, "Name is required").max(200).transform((s) => s.trim()),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().email().transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export type SignInInput = z.infer<typeof signInSchema>;
