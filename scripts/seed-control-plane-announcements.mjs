/**
 * Idempotent seed of platform announcements into Control Plane (Neon).
 * Not Blob. Not JSON SoT after seed.
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.LEAN_EVENT_CONTROL_PLANE_DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: LEAN_EVENT_CONTROL_PLANE_DATABASE_URL missing");
  process.exit(2);
}

const sql = neon(url);

const announcements = [
  {
    id: "welcome-lean-event-2026",
    publishedAt: "2026-07-01T09:00:00.000Z",
    title: "Benvenuto in Lean Event",
    summary:
      "Da qui riceverai gli aggiornamenti periodici su moduli, roadmap e novità del prodotto.",
    body: "Questa è l'area Notifiche di Lean Event. Pubblicheremo qui comunicazioni operative, rilasci e avvisi utili per il tuo team.\n\nPuoi segnare ogni messaggio come letto: il numerino sulla campanella indica solo quelli ancora da aprire.",
    priority: "normal",
  },
  {
    id: "modules-packs-2026-07",
    publishedAt: "2026-07-21T10:00:00.000Z",
    title: "Nuova struttura moduli: Starter, Pro, Business",
    summary:
      "I moduli sono organizzati per pacchetto. Quelli non inclusi nel tuo abbonamento mostrano l'invito all'upgrade.",
    body: "Abbiamo riorganizzato il catalogo:\n\n• Starter — Eventi, Rubrica, Finance, Documenti\n• Pro — Forms, Engagements, Comunicazioni, Web\n• Business — Verbali AI, Writer AI, Designer AI, Traduzioni AI\n• Extra — Lean.Studio\n\nI tool Pro e Business sono disponibili sia in modo standalone (colonna Moduli) sia collegati a un evento (fase Tools).",
    priority: "high",
  },
];

const table = await sql`
  SELECT to_regclass('public.lean_event_platform_announcements') IS NOT NULL AS ok
`;
if (!table[0]?.ok) {
  console.error(
    "FAIL: lean_event_platform_announcements missing. Run: npm run lean-event:apply-control-plane"
  );
  process.exit(2);
}

for (const item of announcements) {
  await sql`
    INSERT INTO lean_event_platform_announcements (
      id, published_at, title, summary, body, priority, updated_at
    )
    VALUES (
      ${item.id},
      ${item.publishedAt},
      ${item.title},
      ${item.summary},
      ${item.body},
      ${item.priority},
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      published_at = EXCLUDED.published_at,
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      body = EXCLUDED.body,
      priority = EXCLUDED.priority,
      updated_at = now()
  `;
  console.log(`UPSERT_ANNOUNCEMENT=${item.id}`);
}

const count = await sql`
  SELECT COUNT(*)::int AS n FROM lean_event_platform_announcements
`;
console.log(`PLATFORM_ANNOUNCEMENTS_COUNT=${count[0].n}`);
console.log("CONTROL_PLANE_ANNOUNCEMENTS_SEED_OK");
