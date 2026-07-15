import { SignJWT, jwtVerify } from "jose";

import type { LeanYouSession } from "@/types/leanyou";

export const SESSION_COOKIE = "leanyou_session";
const SESSION_TTL = "12h";

function getSessionSecret(): Uint8Array {
  const secret =
    process.env.LEANYOU_SESSION_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "dev-only-change-me-before-production";

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: LeanYouSession
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSessionSecret());
}

export async function readSessionToken(
  token: string
): Promise<LeanYouSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return payload as unknown as LeanYouSession;
  } catch {
    return null;
  }
}
