import { Inngest } from "inngest";

/**
 * Official Lean.Event Inngest app (SDK v4).
 * Event key + signing key from env.
 */
export const inngest = new Inngest({
  id: "lean-event",
  name: "Lean.Event",
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
