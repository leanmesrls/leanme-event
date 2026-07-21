import type {
  LeonardoScientificProgram,
  LeonardoScientificProgramSession,
} from "@/types/lean-event";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyScientificSession(
  kind: LeonardoScientificProgramSession["kind"] = "session"
): LeonardoScientificProgramSession {
  return {
    id: newId(),
    kind,
    dayDate: "",
    startTime: "",
    endTime: "",
    title: kind === "break" ? "Pausa" : "",
    moderators: "",
    speakers: "",
    otherSpeakers: "",
  };
}

export function emptyScientificProgram(): LeonardoScientificProgram {
  return { sessions: [] };
}

export function normalizeScientificProgram(
  program?: Partial<LeonardoScientificProgram> | null
): LeonardoScientificProgram {
  if (!program || !Array.isArray(program.sessions)) {
    return emptyScientificProgram();
  }
  return {
    sessions: program.sessions.map((session) => ({
      id: session.id?.trim() || newId(),
      kind: session.kind === "break" ? "break" : "session",
      dayDate: session.dayDate?.trim() ?? "",
      startTime: session.startTime?.trim() ?? "",
      endTime: session.endTime?.trim() ?? "",
      title: session.title?.trim() ?? "",
      moderators: session.moderators?.trim() ?? "",
      speakers: session.speakers?.trim() ?? "",
      otherSpeakers: session.otherSpeakers?.trim() ?? "",
    })),
  };
}

/** Minuti totali sessioni formative (esclude pause). */
export function scientificProgramTrainingMinutes(
  program: LeonardoScientificProgram
): number {
  let total = 0;
  for (const session of program.sessions) {
    if (session.kind === "break") {
      continue;
    }
    const start = parseHm(session.startTime);
    const end = parseHm(session.endTime);
    if (start === null || end === null || end <= start) {
      continue;
    }
    total += end - start;
  }
  return total;
}

function parseHm(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours > 23 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

export function formatDurationMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${minutes} min`;
  }
  if (minutes <= 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} min`;
}
