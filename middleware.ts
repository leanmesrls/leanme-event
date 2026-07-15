import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_PUBLIC_TENANT_SLUG = "iec";
const SESSION_COOKIE = "lean_event_session";
const LEGACY_SESSION_COOKIE = "leanyou_session";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface MiddlewareSession {
  tenantSlug: string;
}

function leanEventLoginPath(): string {
  return "/lean-event/login";
}

function leanEventLeonardoPath(tenantSlug: string): string {
  return `/lean-event/${tenantSlug}/leonardo`;
}

function getSessionSecret(): string {
  return (
    process.env.LEAN_EVENT_SESSION_SECRET?.trim() ||
    process.env.LEANYOU_SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "dev-only-change-me-before-production"
  );
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function readSessionToken(token: string): Promise<MiddlewareSession | null> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = decodeBase64Url(encodedSignature);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature as unknown as ArrayBuffer,
    data
  );
  if (!valid) {
    return null;
  }

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(encodedPayload))
    ) as { tenantSlug?: string; exp?: number };

    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      return null;
    }

    if (!payload.tenantSlug) {
      return null;
    }

    return { tenantSlug: payload.tenantSlug };
  } catch {
    return null;
  }
}

async function readSessionFromRequest(
  request: NextRequest
): Promise<MiddlewareSession | null> {
  for (const name of [SESSION_COOKIE, LEGACY_SESSION_COOKIE]) {
    const token = request.cookies.get(name)?.value;
    if (!token) {
      continue;
    }

    const session = await readSessionToken(token);
    if (session) {
      return session;
    }
  }

  return null;
}

function redirectToUnifiedLogin(
  request: NextRequest,
  nextPath?: string
): NextResponse {
  const loginUrl = new URL(leanEventLoginPath(), request.url);
  if (nextPath) {
    loginUrl.searchParams.set("next", nextPath);
  }
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "next") {
      loginUrl.searchParams.set(key, value);
    }
  });
  return NextResponse.redirect(loginUrl);
}

function parseTenantSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/lean-event\/([^/]+)(?:\/|$)/);
  if (!match?.[1] || match[1] === "login") {
    return null;
  }
  return match[1];
}

function isTenantLoginPath(pathname: string): boolean {
  return /^\/lean-event\/[^/]+\/login$/.test(pathname);
}

function isLegacyLeanEventLeonardoPath(pathname: string): boolean {
  return pathname.startsWith("/lean-event/leonardo");
}

function mapLegacyLeanEventLeonardoPath(
  pathname: string,
  tenantSlug: string
): string | null {
  if (!pathname.startsWith("/lean-event/leonardo")) {
    if (pathname === "/lean-event") {
      return leanEventLeonardoPath(tenantSlug);
    }
    return null;
  }

  const rest = pathname.slice("/lean-event/leonardo".length);
  if (!rest || rest === "/") {
    return leanEventLeonardoPath(tenantSlug);
  }
  if (rest === "/new") {
    return `${leanEventLeonardoPath(tenantSlug)}/verbali/new`;
  }

  const workspaceId = rest.replace(/^\//, "");
  if (UUID_PATTERN.test(workspaceId)) {
    return `${leanEventLeonardoPath(tenantSlug)}/verbali/${workspaceId}`;
  }

  return `/lean-event/${tenantSlug}/leonardo${rest}`;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/lean-event/auth/login") ||
    pathname.startsWith("/api/lean-event/cron/")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/lean-event")) {
    const session = await readSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/lean-event")) {
    return NextResponse.next();
  }

  const session = await readSessionFromRequest(request);

  if (pathname === leanEventLoginPath()) {
    if (session) {
      return NextResponse.redirect(
        new URL(leanEventLeonardoPath(session.tenantSlug), request.url)
      );
    }
    return NextResponse.next();
  }

  if (pathname === "/lean-event") {
    if (session) {
      return NextResponse.redirect(
        new URL(leanEventLeonardoPath(session.tenantSlug), request.url)
      );
    }
    return NextResponse.redirect(new URL(leanEventLoginPath(), request.url));
  }

  if (isTenantLoginPath(pathname)) {
    return redirectToUnifiedLogin(request);
  }

  if (isLegacyLeanEventLeonardoPath(pathname)) {
    const target = mapLegacyLeanEventLeonardoPath(
      pathname,
      session?.tenantSlug ?? DEFAULT_PUBLIC_TENANT_SLUG
    );
    if (target) {
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  const tenantSlug = parseTenantSlugFromPath(pathname);
  if (!tenantSlug) {
    return NextResponse.next();
  }

  if (!session) {
    return redirectToUnifiedLogin(request, pathname);
  }

  if (session.tenantSlug !== tenantSlug) {
    return NextResponse.redirect(
      new URL(leanEventLeonardoPath(session.tenantSlug), request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/lean-event/:path*", "/api/lean-event/:path*"],
};
