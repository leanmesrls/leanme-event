import { SignJWT, jwtVerify } from "jose";

import type { LeanEventSession } from "@/types/lean-event";

export const SESSION_COOKIE = "lean_event_session";
const SESSION_TTL = "12h";

/** Fail-closed: only Lean.Event session cookie. */
export const SESSION_COOKIE_NAMES = [SESSION_COOKIE] as const;

function getSessionSecret(): Uint8Array {
  const secret = process.env.LEAN_EVENT_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "LEAN_EVENT_SESSION_SECRET is required (fail-closed; no legacy fallbacks)"
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: LeanEventSession
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSessionSecret());
}

export async function readSessionToken(
  token: string
): Promise<LeanEventSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return payload as unknown as LeanEventSession;
  } catch {
    return null;
  }
}
