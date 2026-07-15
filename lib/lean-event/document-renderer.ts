import type { LeonardoWorkspace } from "@/types/lean-event";

import { compactStructuredKeywords } from "./keyword-compaction";
import { formatEuropeanDate } from "./dates";

type WorkspaceMeta = Pick<
  LeonardoWorkspace,
  "title" | "meetingDate" | "participants" | "client" | "organization"
>;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatItem(item: unknown): string {
  if (typeof item === "string") {
    return item;
  }
  if (Array.isArray(item)) {
    return item.map((entry) => formatItem(entry)).join(", ");
  }
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    return String(
      record.title ??
        record.name ??
        record.description ??
        record.question ??
        record.attivita ??
        JSON.stringify(record)
    );
  }
  return "";
}

function renderList(items: unknown[]): string {
  if (items.length === 0) {
    return "<p>-</p>";
  }

  return `<ul>${items
    .map((item) => `<li>${escapeHtml(formatItem(item))}</li>`)
    .join("")}</ul>`;
}

function renderIntegralTranscript(
  data: Record<string, unknown>,
  workspace: WorkspaceMeta,
  transcript: string
): string {
  const outputs = (data.outputs as Record<string, Record<string, unknown>>) ?? {};
  const integral = outputs.trascrizione_integrale ?? {};
  const speakers = (integral.speakers as unknown[]) ?? (data.partecipanti as unknown[]) ?? [];

  return `<article class="minutes-document">
  <h2>Trascrizione Integrale</h2>
  <p class="text-muted">${escapeHtml(workspace.title)} - Powered by Lean.Agent.AI</p>
  <h3>Speaker identificati</h3>
  ${renderList(speakers)}
  <h3>Contenuto completo</h3>
  <pre class="transcript-block">${escapeHtml(String(integral.content ?? transcript))}</pre>
</article>`;
}

function renderParagraphs(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) {
    return "<p>-</p>";
  }

  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function renderTopicDevelopment(items: unknown[]): string {
  if (items.length === 0) {
    return "";
  }

  return items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }
      const record = item as Record<string, unknown>;
      const title = String(record.titolo ?? record.title ?? "").trim();
      const content = String(record.contenuto ?? record.content ?? "").trim();
      if (!title && !content) {
        return "";
      }
      return `<h3>${escapeHtml(title || "Argomento")}</h3>${renderParagraphs(content)}`;
    })
    .join("");
}

function renderDetailedMinutes(
  data: Record<string, unknown>,
  workspace: WorkspaceMeta
): string {
  const outputs = (data.outputs as Record<string, Record<string, unknown>>) ?? {};
  const doc = outputs.verbale_dettagliato ?? {};
  const appendixSections: Array<[string, unknown[]]> = [
    ["Obiettivi", (doc.obiettivi as unknown[]) ?? []],
    ["Decisioni prese", (doc.decisioni_prese as unknown[]) ?? []],
    ["Attività assegnate", (doc.attivita_assegnate as unknown[]) ?? []],
    ["Responsabili", (doc.responsabili as unknown[]) ?? []],
    ["Scadenze", (doc.scadenze as unknown[]) ?? []],
    ["Criticità", (doc.criticita as unknown[]) ?? []],
  ];

  return `<article class="minutes-document">
  <h2>Verbale Dettagliato</h2>
  <p class="text-muted">${escapeHtml(workspace.title)} - Powered by Lean.Agent.AI</p>
  <h3>Titolo riunione</h3>
  <p>${escapeHtml(workspace.title)}</p>
  <h3>Data</h3>
  <p>${escapeHtml(formatEuropeanDate(workspace.meetingDate))}</p>
  <h3>Partecipanti</h3>
  ${renderList((data.partecipanti as unknown[]) ?? [])}
  <h3>Introduzione</h3>
  ${renderParagraphs(doc.introduzione)}
  <h3>Sintesi delle discussioni</h3>
  ${renderParagraphs(doc.sintesi_discussioni ?? data.summary ?? "")}
  ${renderTopicDevelopment((doc.sviluppo_per_argomento as unknown[]) ?? [])}
  <h3>Allegato operativo</h3>
  ${appendixSections
    .map(
      ([label, items]) =>
        `<h4>${escapeHtml(label)}</h4>${renderList(items)}`
    )
    .join("")}
  <h3>Conclusioni</h3>
  ${renderParagraphs(doc.conclusioni ?? data.executive_summary ?? "")}
</article>`;
}

function renderSyntheticMinutes(data: Record<string, unknown>, workspace: WorkspaceMeta): string {
  const outputs = (data.outputs as Record<string, Record<string, unknown>>) ?? {};
  const synthetic = outputs.verbale_sintetico ?? {};

  return `<article class="minutes-document">
  <h2>Verbale sintetico</h2>
  <p class="text-muted">${escapeHtml(workspace.title)}</p>
  <h3>Riassunto</h3>
  <p>${escapeHtml(String(synthetic.summary ?? data.executive_summary ?? data.summary ?? "")).replace(/\n/g, "<br />")}</p>
  <h3>Argomenti trattati</h3>
  ${renderList((synthetic.topics as unknown[]) ?? (data.topics as unknown[]) ?? [])}
  <h3>Decisioni</h3>
  ${renderList((data.decisioni as unknown[]) ?? [])}
  <h3>Azioni</h3>
  ${renderList((data.attivita as unknown[]) ?? [])}
</article>`;
}

function renderKeywordsTopics(data: Record<string, unknown>, workspace: WorkspaceMeta): string {
  const compacted = compactStructuredKeywords(data);
  const outputs = (compacted.outputs as Record<string, Record<string, unknown>>) ?? {};
  const output = outputs.keywords_topics ?? {};
  const groups: Array<[string, unknown[]]> = [
    ["Parole chiave", (output.keywords as unknown[]) ?? (compacted.keyword as unknown[]) ?? []],
    ["Concetti e argomenti", (output.topics as unknown[]) ?? (data.topics as unknown[]) ?? []],
    ["Persone", (output.people as unknown[]) ?? []],
    ["Aziende", (output.companies as unknown[]) ?? []],
    ["Software", (output.software as unknown[]) ?? []],
    ["Progetti", (output.projects as unknown[]) ?? []],
    ["Temi ricorrenti", (output.recurring_themes as unknown[]) ?? []],
  ];

  return `<article class="minutes-document">
  <h2>Keywords &amp; Topics</h2>
  <p class="text-muted">${escapeHtml(workspace.title)}</p>
  ${groups
    .map(
      ([label, items]) =>
        `<h3>${escapeHtml(label)}</h3><div class="keyword-list">${items
          .map((item) => `<span>${escapeHtml(formatItem(item))}</span>`)
          .join("") || "-"}</div>`
    )
    .join("")}
</article>`;
}

function renderExecutiveReport(data: Record<string, unknown>, workspace: WorkspaceMeta): string {
  const outputs = (data.outputs as Record<string, Record<string, unknown>>) ?? {};
  const report = outputs.executive_report ?? {};
  const sections: Array<[string, unknown[]]> = [
    ["Decisioni", (report.decisioni as unknown[]) ?? (data.decisioni as unknown[]) ?? []],
    ["Opportunità", (report.opportunita as unknown[]) ?? []],
    ["Criticità", (report.criticita as unknown[]) ?? (data.rischi as unknown[]) ?? []],
    ["Rischi", (report.rischi as unknown[]) ?? (data.rischi as unknown[]) ?? []],
    ["Suggerimenti AI", (report.suggerimenti_ai as unknown[]) ?? []],
    ["Priorità", (report.priorita as unknown[]) ?? []],
    ["Prossimi passi", (report.prossimi_passi as unknown[]) ?? (data.attivita as unknown[]) ?? []],
  ];

  return `<article class="minutes-document">
  <h2>Executive Report</h2>
  <p class="text-muted">${escapeHtml(workspace.title)}</p>
  ${sections
    .map(([label, items]) => `<h3>${escapeHtml(label)}</h3>${renderList(items)}`)
    .join("")}
</article>`;
}

function renderActionPlan(data: Record<string, unknown>, workspace: WorkspaceMeta): string {
  const outputs = (data.outputs as Record<string, unknown>) ?? {};
  const rows = (outputs.action_plan as Array<Record<string, unknown>>) ?? [];

  return `<article class="minutes-document">
  <h2>Piano d'Azione</h2>
  <p class="text-muted">${escapeHtml(workspace.title)} - Powered by Lean.Agent.AI</p>
  <table>
    <thead>
      <tr>
        <th>Attività</th>
        <th>Responsabile</th>
        <th>Scadenza</th>
        <th>Priorità</th>
        <th>Stato</th>
        <th>Dipendenze</th>
      </tr>
    </thead>
    <tbody>
      ${
        rows.length === 0
          ? "<tr><td colspan=\"6\">-</td></tr>"
          : rows
              .map(
                (item) => `<tr>
          <td>${escapeHtml(item.attivita)}</td>
          <td>${escapeHtml(item.responsabile)}</td>
          <td>${escapeHtml(item.scadenza)}</td>
          <td>${escapeHtml(item.priorita)}</td>
          <td>${escapeHtml(item.stato ?? "Da fare")}</td>
          <td>${escapeHtml(
            Array.isArray(item.dipendenze)
              ? item.dipendenze.join(", ")
              : item.dipendenze
          )}</td>
        </tr>`
              )
              .join("")
      }
    </tbody>
  </table>
</article>`;
}

function renderEmailFollowup(data: Record<string, unknown>, workspace: WorkspaceMeta): string {
  const outputs = (data.outputs as Record<string, Record<string, unknown>>) ?? {};
  const email = outputs.email_followup ?? {};

  return `<article class="minutes-document">
  <h2>Email di follow-up</h2>
  <p class="text-muted">${escapeHtml(workspace.title)}</p>
  <h3>Oggetto</h3>
  <p>${escapeHtml(email.subject)}</p>
  <h3>Testo</h3>
  <p>${escapeHtml(String(email.body ?? "")).replace(/\n/g, "<br />")}</p>
</article>`;
}

export function renderLeonardoDocumentHtml(
  documentId: string,
  data: Record<string, unknown>,
  workspace: WorkspaceMeta,
  transcript: string
): string {
  switch (documentId) {
    case "integral_transcript":
      return renderIntegralTranscript(data, workspace, transcript);
    case "detailed_minutes":
      return renderDetailedMinutes(data, workspace);
    case "synthetic_minutes":
      return renderSyntheticMinutes(data, workspace);
    case "keywords_topics":
      return renderKeywordsTopics(data, workspace);
    case "executive_report":
      return renderExecutiveReport(data, workspace);
    case "action_plan":
      return renderActionPlan(data, workspace);
    case "email_followup":
      return renderEmailFollowup(data, workspace);
    default:
      return `<article><p>Documento non disponibile.</p></article>`;
  }
}

export function wrapWordHtml(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title><style>
body{font-family:Arial,sans-serif;color:#17202a;line-height:1.45;margin:24px}
h1{font-size:26px}h2{font-size:18px;margin-top:24px}h3{font-size:15px;margin-top:18px}h4{font-size:14px;margin-top:16px}
.text-muted{color:#6b7280}li{margin-bottom:6px}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px;text-align:left}
.keyword-list span{display:inline-block;margin:0 8px 8px 0;padding:4px 8px;background:#f3f4f6;border-radius:999px}
pre.transcript-block{white-space:pre-wrap;font-family:Arial,sans-serif;background:#f9fafb;padding:12px;border:1px solid #e5e7eb}
</style></head><body>${body}</body></html>`;
}

export function renderLeonardoDocuments(
  structured: Record<string, unknown>,
  workspace: WorkspaceMeta,
  transcript: string
): Record<string, string> {
  const documentIds = [
    "integral_transcript",
    "detailed_minutes",
    "synthetic_minutes",
    "keywords_topics",
    "executive_report",
    "action_plan",
    "email_followup",
  ] as const;

  const documents: Record<string, string> = {};
  for (const documentId of documentIds) {
    const body = renderLeonardoDocumentHtml(
      documentId,
      structured,
      workspace,
      transcript
    );
    documents[documentId] = wrapWordHtml(
      `${workspace.title} - ${documentId}`,
      body
    );
  }

  return documents;
}
