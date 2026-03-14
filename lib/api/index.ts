/**
 * API client and response types for frontend.
 */

export {
  getApiUrl,
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  type RequestMethod,
  type ApiClientOptions,
} from "./client";
export type { ApiSuccessResponse, ApiErrorResponse } from "./responses";
export { isSuccessResponse } from "./responses";
