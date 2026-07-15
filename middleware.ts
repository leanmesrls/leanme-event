import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_PUBLIC_TENANT_SLUG } from "@/lib/leanyou/constants";
import {
  isLegacyLeanYouLeonardoPath,
  isTenantLoginPath,
  leanyouLeonardoPath,
  leanyouLoginPath,
  mapLegacyLeanYouLeonardoPath,
  parseTenantSlugFromPath,
} from "@/lib/leanyou/paths";
import { SESSION_COOKIE, readSessionToken } from "@/lib/leanyou/session-token";

function redirectToUnifiedLogin(
  request: NextRequest,
  nextPath?: string
): NextResponse {
  const loginUrl = new URL(leanyouLoginPath(), request.url);
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/leanyou/auth/login")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/leanyou")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await readSessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/leanyou")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await readSessionToken(token) : null;

  if (pathname === leanyouLoginPath()) {
    if (session) {
      return NextResponse.redirect(
        new URL(leanyouLeonardoPath(session.tenantSlug), request.url)
      );
    }
    return NextResponse.next();
  }

  if (pathname === "/leanyou") {
    if (session) {
      return NextResponse.redirect(
        new URL(leanyouLeonardoPath(session.tenantSlug), request.url)
      );
    }
    return NextResponse.redirect(new URL(leanyouLoginPath(), request.url));
  }

  if (isTenantLoginPath(pathname)) {
    return redirectToUnifiedLogin(request);
  }

  if (isLegacyLeanYouLeonardoPath(pathname)) {
    const target = mapLegacyLeanYouLeonardoPath(
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
      new URL(leanyouLeonardoPath(session.tenantSlug), request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/leanyou/:path*", "/api/leanyou/:path*"],
};
