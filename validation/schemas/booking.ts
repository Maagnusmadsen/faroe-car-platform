import { z } from "zod";

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD");

export const bookingCreateSchema = z
  .object({
    listingId: z.string().min(1, "listingId is required"),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
  })
  .strict();

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;

export const bookingListQuerySchema = z.object({
  role: z.enum(["renter", "owner"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;

export const bookingStatusUpdateSchema = z
  .object({
    status: z.enum([
      "PENDING_PAYMENT",
      "PENDING_APPROVAL",
      "CONFIRMED",
      "REJECTED",
      "CANCELLED",
      "COMPLETED",
      "DISPUTED",
    ]),
  })
  .strict();

export type BookingStatusUpdateInput = z.infer<
  typeof bookingStatusUpdateSchema
>;

