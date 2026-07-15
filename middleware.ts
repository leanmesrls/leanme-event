import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_PUBLIC_TENANT_SLUG } from "@/lib/lean-event/constants";
import {
  isLegacyLeanEventLeonardoPath,
  isTenantLoginPath,
  leanEventLeonardoPath,
  leanEventLoginPath,
  mapLegacyLeanEventLeonardoPath,
  parseTenantSlugFromPath,
} from "@/lib/lean-event/paths";
import { SESSION_COOKIE, readSessionToken } from "@/lib/lean-event/session-token";

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

async function readSessionFromRequest(request: NextRequest) {
  const token =
    request.cookies.get(SESSION_COOKIE)?.value ??
    request.cookies.get("leanyou_session")?.value;
  return token ? readSessionToken(token) : null;
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
