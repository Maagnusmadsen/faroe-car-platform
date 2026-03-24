/**
 * Inngest client for background job processing.
 * Used to send events and serve functions.
 * In production, INNGEST_EVENT_KEY is required (validated at send time).
 */

import { Inngest } from "inngest";

function getEventKey(): string | undefined {
  return process.env.INNGEST_EVENT_KEY;
}

export const inngest = new Inngest({
  id: "rentlocal",
  name: "RentLocal",
  eventKey: getEventKey(),
});
