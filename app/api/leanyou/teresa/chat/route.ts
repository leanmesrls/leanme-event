import { NextResponse } from "next/server";

import {
  TERESA_MAX_MESSAGES_PER_THREAD,
  createTeresaChatThread,
  listTeresaChatMessages,
  listTeresaThreadsForUser,
  sendTeresaChatMessage,
  type TeresaChatContext,
} from "@/lib/lean-event/teresa-chat";
import {
  forbiddenResponse,
  handleLeanEventRouteError,
  requireSession,
} from "@/lib/lean-event/server-auth";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");

    const threads = await listTeresaThreadsForUser(session);
    const activeThreadId =
      threadId && threads.some((thread) => thread.id === threadId)
        ? threadId
        : threads[0]?.id ?? null;
    const messages = activeThreadId
      ? await listTeresaChatMessages(session, activeThreadId)
      : [];

    return NextResponse.json({
      threads,
      activeThreadId,
      messages,
      maxMessagesPerThread: TERESA_MAX_MESSAGES_PER_THREAD,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return forbiddenResponse();
    }
    return handleLeanEventRouteError(error, "Lettura chat Teresa non riuscita.");
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as {
      action?: "message" | "new_thread";
      message?: string;
      threadId?: string;
      context?: TeresaChatContext;
    };

    if (body.action === "new_thread") {
      const thread = await createTeresaChatThread(session);
      const threads = await listTeresaThreadsForUser(session);
      return NextResponse.json({
        ok: true,
        activeThreadId: thread.id,
        threads,
        messages: [],
        maxMessagesPerThread: TERESA_MAX_MESSAGES_PER_THREAD,
      });
    }

    const message = body.message?.trim() ?? "";
    if (!message) {
      return NextResponse.json(
        { error: "Messaggio vuoto." },
        { status: 400 }
      );
    }

    const result = await sendTeresaChatMessage(session, {
      message,
      threadId: body.threadId,
      context: body.context,
    });
    const threads = await listTeresaThreadsForUser(session);

    return NextResponse.json({
      ok: true,
      reply: result.reply,
      activeThreadId: result.thread.id,
      messages: result.thread.messages,
      threads,
      maxMessagesPerThread: TERESA_MAX_MESSAGES_PER_THREAD,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FORBIDDEN") {
        return forbiddenResponse();
      }
      if (error.message === "OPENAI_API_KEY_MISSING") {
        return NextResponse.json(
          {
            error:
              "OPENAI_API_KEY non configurata. Imposta la chiave in .env.local.",
          },
          { status: 503 }
        );
      }
      if (error.message === "MESSAGE_TOO_LONG") {
        return NextResponse.json(
          { error: "Messaggio troppo lungo." },
          { status: 400 }
        );
      }
      if (error.message.startsWith("TERESA_OPENAI_FAILED")) {
        return NextResponse.json(
          { error: "Teresa non è riuscita a rispondere. Riprova tra poco." },
          { status: 502 }
        );
      }
    }
    return handleLeanEventRouteError(error, "Chat Teresa non riuscita.");
  }
}
