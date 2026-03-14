/**
 * Validation barrel export.
 * Use these schemas in API route handlers with parseOrThrow (lib/utils/validate).
 */

export {
  carCreateSchema,
  carsQuerySchema,
  type CarCreateInput,
  type CarsQueryInput,
} from "./schemas/car";
export {
  idParamSchema,
  paginationSchema,
  type PaginationInput,
} from "./schemas/common";
export {
  signUpSchema,
  signInSchema,
  type SignUpInput,
  type SignInInput,
} from "./schemas/auth";
export { updateProfileSchema, type UpdateProfileInput } from "./schemas/profile";
export {
  reviewCreateSchema,
  type ReviewCreateInput,
} from "./schemas/review";
export {
  bookingCreateSchema,
  bookingListQuerySchema,
  bookingStatusUpdateSchema,
  type BookingCreateInput,
  type BookingListQuery,
  type BookingStatusUpdateInput,
} from "./schemas/booking";
