import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_PUBLIC_TENANT_SLUG = "iec";
const SESSION_COOKIE = "lean_event_session";
const LEGACY_SESSION_COOKIE = "leanyou_session";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function leanEventLoginPath(): string {
  return "/lean-event/login";
}

function leanEventLeonardoPath(tenantSlug: string): string {
  return `/lean-event/${tenantSlug}/leonardo`;
}

function getSessionSecret(): Uint8Array {
  const secret =
    process.env.LEAN_EVENT_SESSION_SECRET?.trim() ||
    process.env.LEANYOU_SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "dev-only-change-me-before-production";

  return new TextEncoder().encode(secret);
}

async function readSessionFromRequest(request: NextRequest) {
  for (const name of [SESSION_COOKIE, LEGACY_SESSION_COOKIE]) {
    const token = request.cookies.get(name)?.value;
    if (!token) {
      continue;
    }

    try {
      const { payload } = await jwtVerify(token, getSessionSecret());
      const session = payload as { tenantSlug?: string };
      if (session.tenantSlug) {
        return session as { tenantSlug: string };
      }
    } catch {
      // Try next cookie name.
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

  if (pathname.startsWith("/api/lean-event/auth/login")) {
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
