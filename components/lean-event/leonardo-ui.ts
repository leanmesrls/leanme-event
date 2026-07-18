/** Superficie dati chiara (canvas) — form, tabelle, sezioni editabili. */
export const LEONARDO_CANVAS_SURFACE =
  "leonardo-canvas rounded-xl border border-zinc-300/80 bg-[#f0f0f3] p-5 shadow-sm sm:p-6";

/** Titolo pagina / sezione principale (Eventi, Ospiti, Rubrica…). */
export const LEONARDO_PAGE_TITLE =
  "text-xl font-bold tracking-[0.04em] text-leanme-fuchsia sm:text-2xl";

/** Titolo pannello interno evento (h3 uppercase). */
export const LEONARDO_PANEL_TITLE =
  "text-base font-bold uppercase tracking-[0.12em] text-leanme-fuchsia sm:text-lg";

/** Intestazione sezione collassabile (Hotel, Transfer, Viaggi…). */
export const LEONARDO_COLLAPSIBLE_TITLE =
  "text-sm font-bold uppercase tracking-[0.1em] text-leanme-fuchsia";

/** Nome primario in elenchi tabella — troncato per titoli lunghi. */
export const LEONARDO_LIST_NAME_LINK =
  "block truncate font-medium text-leanme-fuchsia transition hover:text-leanme-fuchsia-dark";

export const LEONARDO_LIST_NAME_CELL =
  "max-w-[min(100%,280px)] sm:max-w-[min(100%,360px)] lg:max-w-[min(100%,420px)]";

/** Intestazione tabella fissa durante lo scroll (elenchi lunghi). */
export const LEONARDO_LIST_STICKY_HEADER =
  "sticky top-0 z-10 bg-[#141414] text-left text-[10px] uppercase tracking-[0.12em] text-white/45 shadow-[0_1px_0_rgba(255,255,255,0.08)]";

/** Badge avviso completezza anagrafica in elenchi. */
export const LEONARDO_LIST_ISSUE_BADGE =
  "inline-flex rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-100";

/**
 * Standard UI elenchi Leonardo (ospiti, fornitori, rubrica…)
 *
 * - Sezioni: `LeonardoCollapsiblePanel` (sempre collassabili, summary in header)
 * - Liste lunghe: filtri + `LeonardoListPagination` (25/50/100 o scroll virtual)
 * - Dettaglio: riga cliccabile → `LeonardoSheetModal` (Esc / overlay per chiudere)
 * - Deep link: query param dedicato (`?ospite=`, `?fornitore=`) per aprire la scheda
 * - Componenti condivisi: `LeonardoListPagination`, `LeonardoVirtualList`, `leonardo-ui` tokens
 */
export const LEONARDO_LIST_UX_STANDARD = "collapsible-panels + pagination + sheet-modal" as const;
