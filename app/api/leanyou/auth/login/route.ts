import { NextResponse } from "next/server";

import {
  auditContextFromSession,
  clientIpFromRequest,
  writeLeanYouAuditEvent,
} from "@/lib/leanyou/audit-log";
import {
  createSessionPayload,
  findUserByEmail,
  findUserByToken,
  verifyPassword,
} from "@/lib/leanyou/auth";
import {
  createSessionToken,
  withSessionCookie,
} from "@/lib/leanyou/session";

function tenantMismatch(
  requestedTenantSlug: string | undefined,
  tenantSlug: string
): boolean {
  return Boolean(
    requestedTenantSlug?.trim() &&
      requestedTenantSlug.trim() !== tenantSlug
  );
}

async function logLoginFailure(
  request: Request,
  detail: string,
  partial?: {
    tenantId?: string;
    tenantSlug?: string;
    tenantName?: string;
    userEmail?: string;
    method?: "email" | "token";
  }
) {
  await writeLeanYouAuditEvent({
    action: "login_failed",
    detail,
    ip: clientIpFromRequest(request),
    ...partial,
  });
}

export async function POST(request: Request) {
  let body: {
    email?: string;
    password?: string;
    token?: string;
    tenantSlug?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Richiesta non valida." },
      { status: 400 }
    );
  }

  try {
    return await handleLogin(request, body);
  } catch (error) {
    console.error(
      JSON.stringify({
        leanyou_login_error: {
          message: error instanceof Error ? error.message : String(error),
        },
      })
    );
    return NextResponse.json(
      { error: "Errore interno del server." },
      { status: 500 }
    );
  }
}

async function handleLogin(
  request: Request,
  body: {
    email?: string;
    password?: string;
    token?: string;
    tenantSlug?: string;
  }
) {

  if (body.token?.trim()) {
    const match = await findUserByToken(body.token.trim());
    if (!match?.user) {
      await logLoginFailure(request, "Token non valido.", {
        method: "token",
      });
      return NextResponse.json(
        { error: "Token non valido." },
        { status: 401 }
      );
    }

    if (tenantMismatch(body.tenantSlug, match.tenant.slug)) {
      await logLoginFailure(request, "Token non valido per questo cliente.", {
        tenantId: match.tenant.id,
        tenantSlug: match.tenant.slug,
        tenantName: match.tenant.name,
        userEmail: match.user.email,
        method: "token",
      });
      return NextResponse.json(
        { error: "Token non valido per questo cliente." },
        { status: 401 }
      );
    }

    const session = createSessionPayload(match.tenant, match.user);
    const token = await createSessionToken(session);
    await writeLeanYouAuditEvent({
      action: "login_success",
      method: "token",
      ip: clientIpFromRequest(request),
      ...auditContextFromSession(session),
    });
    return withSessionCookie(
      NextResponse.json({ ok: true, session }),
      token
    );
  }

  if (!body.email?.trim() || !body.password) {
    await logLoginFailure(request, "Email e password obbligatorie.", {
      userEmail: body.email?.trim(),
      method: "email",
    });
    return NextResponse.json(
      { error: "Email e password obbligatorie." },
      { status: 400 }
    );
  }

  const match = await findUserByEmail(body.email);
  if (!match) {
    await logLoginFailure(request, "Credenziali non valide.", {
      userEmail: body.email.trim(),
      method: "email",
    });
    return NextResponse.json(
      { error: "Credenziali non valide." },
      { status: 401 }
    );
  }

  if (tenantMismatch(body.tenantSlug, match.tenant.slug)) {
    await logLoginFailure(request, "Credenziali non valide per questo cliente.", {
      tenantId: match.tenant.id,
      tenantSlug: match.tenant.slug,
      tenantName: match.tenant.name,
      userEmail: match.user.email,
      method: "email",
    });
    return NextResponse.json(
      { error: "Credenziali non valide per questo cliente." },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(body.password, match.user.passwordHash);
  if (!valid) {
    await logLoginFailure(request, "Password non valida.", {
      tenantId: match.tenant.id,
      tenantSlug: match.tenant.slug,
      tenantName: match.tenant.name,
      userEmail: match.user.email,
      method: "email",
    });
    return NextResponse.json(
      { error: "Credenziali non valide." },
      { status: 401 }
    );
  }

  const session = createSessionPayload(match.tenant, match.user);
  const token = await createSessionToken(session);
  await writeLeanYouAuditEvent({
    action: "login_success",
    method: "email",
    ip: clientIpFromRequest(request),
    ...auditContextFromSession(session),
  });
  return withSessionCookie(
    NextResponse.json({ ok: true, session }),
    token
  );
}
