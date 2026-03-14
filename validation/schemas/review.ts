import { z } from "zod";

export const reviewCreateSchema = z
  .object({
    bookingId: z.string().min(1, "bookingId is required"),
    rating: z.coerce.number().int().min(1).max(5),
    body: z.string().max(5000).optional(),
  })
  .strict();

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;

