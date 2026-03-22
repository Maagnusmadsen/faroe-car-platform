/**
 * Inngest client for background job processing.
 * Used to send events and serve functions.
 */

import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "rentlocal",
  name: "RentLocal",
});
