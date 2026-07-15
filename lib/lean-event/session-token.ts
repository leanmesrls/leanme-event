import { SignJWT, jwtVerify } from "jose";

import type { LeanEventSession } from "@/types/lean-event";

export const SESSION_COOKIE = "lean_event_session";
const SESSION_TTL = "12h";
const LEGACY_SESSION_COOKIE = "leanyou_session";

export const SESSION_COOKIE_NAMES = [SESSION_COOKIE, LEGACY_SESSION_COOKIE] as const;

function getSessionSecret(): Uint8Array {
  const secret =
    process.env.LEAN_EVENT_SESSION_SECRET?.trim() ||
    process.env.LEANYOU_SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "dev-only-change-me-before-production";

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
