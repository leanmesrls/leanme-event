"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LeonardoCollapsiblePanel } from "@/components/lean-event/LeonardoCollapsiblePanel";
import { LeonardoContactImport } from "@/components/lean-event/LeonardoContactImport";
import { LeonardoContactListTable } from "@/components/lean-event/LeonardoContactListTable";
import { LeonardoContactSheetModal } from "@/components/lean-event/LeonardoContactSheetModal";
import { LeonardoListPagination, LEONARDO_DEFAULT_PAGE_SIZE } from "@/components/lean-event/LeonardoListPagination";
import { LeonardoListSortSelect } from "@/components/lean-event/LeonardoListSortSelect";
import { LeonardoRubricaNav } from "@/components/lean-event/LeonardoRubricaNav";
import { LEONARDO_PAGE_TITLE } from "@/components/lean-event/leonardo-ui";
import {
  collectContactTags,
} from "@/lib/lean-event/contact-tags";
import {
  contactMatchesFilters,
  downloadContactsCsv,
} from "@/lib/lean-event/contact-export";
import { formatContactName } from "@/lib/lean-event/contact-display";
import { paginateList, type LeonardoPageSize } from "@/lib/lean-event/list-pagination";
import { sortContacts, type ListSortMode } from "@/lib/lean-event/list-sort";
import { useLeonardoListKeyboard } from "@/lib/lean-event/use-leonardo-list-keyboard";
import type { LeanEventContact } from "@/types/lean-event";

interface LeonardoContactListProps {
  tenantSlug: string;
  initialContacts: LeanEventContact[];
  clientiEnabled?: boolean;
  initialContactId?: string | null;
}

export function LeonardoContactList({
  tenantSlug,
  initialContacts,
  clientiEnabled = false,
  initialContactId = null,
}: LeonardoContactListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState(
    initialContacts.map((contact) => ({
      ...contact,
      tags: contact.tags ?? [],
    }))
  );
  const [sheetContactId, setSheetContactId] = useState<string | null>(
    initialContactId
  );
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sortMode, setSortMode] = useState<Exclude<ListSortMode, "date_start">>(
    "alphabetical"
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<LeonardoPageSize>(
    LEONARDO_DEFAULT_PAGE_SIZE
  );
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organization: "",
    tags: "",
  });

  useEffect(() => {
    setContacts(
      initialContacts.map((contact) => ({
        ...contact,
        tags: contact.tags ?? [],
      }))
    );
  }, [initialContacts]);

  useEffect(() => {
    if (initialContactId) {
      setSheetContactId(initialContactId);
    }
  }, [initialContactId]);

  const availableTags = useMemo(() => collectContactTags(contacts), [contacts]);

  const filtered = useMemo(() => {
    const rows = contacts.filter((contact) =>
      contactMatchesFilters(contact, query, tagFilter)
    );
    return sortContacts(rows, sortMode);
  }, [contacts, query, tagFilter, sortMode]);

  useEffect(() => {
    setPage(1);
  }, [query, tagFilter, sortMode, pageSize]);

  const paginated =
    pageSize === "virtual"
      ? { pageItems: filtered, totalPages: 1, currentPage: 1 }
      : paginateList(filtered, page, pageSize);

  const sheetContact = sheetContactId
    ? contacts.find((item) => item.id === sheetContactId) ?? null
    : null;

  const syncContactSheet = useCallback(
    (contactId: string | null) => {
      setSheetContactId(contactId);
      const params = new URLSearchParams(searchParams.toString());
      if (contactId) {
        params.set("contatto", contactId);
      } else {
        params.delete("contatto");
      }
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  useLeonardoListKeyboard({
    enabled: filtered.length > 0,
    items: paginated.pageItems,
    activeId: sheetContactId,
    onSelect: syncContactSheet,
  });

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (creating) {
      return;
    }
    setError(null);
    setCreating(true);

    try {
      const response = await fetch("/api/lean-event/contacts", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as {
        error?: string;
        duplicate?: boolean;
        contact?: LeanEventContact;
      };

      if (response.status === 409 && payload.contact) {
        setError(
          `Email già presente (${formatContactName(payload.contact)}). Usa l'import per gestire i duplicati.`
        );
        return;
      }

      if (!response.ok || !payload.contact) {
        setError(payload.error ?? "Creazione contatto non riuscita.");
        return;
      }

      setContacts((current) => {
        const withoutDupes = payload.contact!.email.trim()
          ? current.filter(
              (item) =>
                item.email.trim().toLowerCase() !==
                payload.contact!.email.trim().toLowerCase()
            )
          : current;
        return [...withoutDupes, { ...payload.contact!, tags: payload.contact!.tags ?? [] }].sort(
          (a, b) =>
            `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "it")
        );
      });
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        organization: "",
        tags: "",
      });
      syncContactSheet(payload.contact.id);
    } finally {
      setCreating(false);
    }
  }

  async function reloadContacts() {
    const response = await fetch("/api/lean-event/contacts", {
      credentials: "same-origin",
    });
    const payload = (await response.json()) as { contacts?: LeanEventContact[] };
    if (payload.contacts) {
      setContacts(
        payload.contacts.map((contact) => ({ ...contact, tags: contact.tags ?? [] }))
      );
    }
  }

  function handleExport() {
    if (filtered.length === 0) {
      setError("Nessun contatto da esportare con i filtri attuali.");
      return;
    }
    setError(null);
    const hasFilters = query.trim().length > 0 || tagFilter.length > 0;
    downloadContactsCsv(
      filtered,
      hasFilters ? "lean-event-rubrica-contatti-filtrato.csv" : "lean-event-rubrica-contatti.csv"
    );
  }

  return (
    <div className="space-y-6">
      <LeonardoRubricaNav tenantSlug={tenantSlug} clientiEnabled={clientiEnabled} />

      <div>
        <h2 className={LEONARDO_PAGE_TITLE}>Rubrica contatti</h2>
        <p className="mt-2 text-sm text-white/60">
          {contacts.length} contatti · elenco paginato · scheda in popup · j/k per navigare
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      <LeonardoCollapsiblePanel
        title="Elenco contatti"
        summary={`${filtered.length} visibili · ${contacts.length} totali`}
        defaultOpen
      >
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[200px] flex-1 text-sm">
              <span className="mb-1 block text-white/60">Cerca</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome, email, CF, telefono, tag…"
                className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-white/60">Tag</span>
              <select
                value={tagFilter}
                onChange={(event) => setTagFilter(event.target.value)}
                className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
              >
                <option value="">Tutti</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>
            <LeonardoListSortSelect
              value={sortMode}
              onChange={(value) =>
                setSortMode(value as Exclude<ListSortMode, "date_start">)
              }
            />
            <button
              type="button"
              onClick={handleExport}
              className="rounded-full border border-white/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia"
            >
              Esporta CSV
            </button>
          </div>

          {availableTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {availableTags.slice(0, 12).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    tagFilter === tag
                      ? "bg-leanme-fuchsia text-white"
                      : "border border-white/15 text-white/60 hover:border-white/30"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <p className="text-sm text-white/50">
              {contacts.length === 0
                ? "Nessun contatto. Apri «Inserimento e import»."
                : "Nessun risultato con i filtri attuali."}
            </p>
          ) : (
            <>
              <LeonardoListPagination
                totalItems={filtered.length}
                page={paginated.currentPage}
                totalPages={paginated.totalPages}
                pageSize={pageSize}
                pageItemsCount={paginated.pageItems.length}
                itemLabel="contatti"
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
              <LeonardoContactListTable
                contacts={paginated.pageItems}
                activeContactId={sheetContactId}
                onOpenSheet={syncContactSheet}
                virtualScroll={pageSize === "virtual"}
              />
            </>
          )}
        </div>
      </LeonardoCollapsiblePanel>

      <LeonardoCollapsiblePanel
        title="Inserimento e import"
        summary="Nuovo contatto o import massivo"
      >
        <div className="space-y-4 pt-2">
          <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <input
              required
              placeholder="Nome *"
              value={form.firstName}
              onChange={(event) => setForm({ ...form, firstName: event.target.value })}
              className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
            <input
              required
              placeholder="Cognome *"
              value={form.lastName}
              onChange={(event) => setForm({ ...form, lastName: event.target.value })}
              className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
            <input
              placeholder="Telefono"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
            <input
              placeholder="Organizzazione"
              value={form.organization}
              onChange={(event) =>
                setForm({ ...form, organization: event.target.value })
              }
              className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia"
            />
            <input
              placeholder="Tag (virgola)"
              value={form.tags}
              onChange={(event) => setForm({ ...form, tags: event.target.value })}
              className="rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia md:col-span-2 xl:col-span-3"
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-leanme-fuchsia px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-fuchsia-dark disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2 xl:col-span-3 xl:justify-self-start"
            >
              {creating ? "Salvataggio…" : "Salva contatto"}
            </button>
          </form>
          <LeonardoContactImport compact onImported={reloadContacts} />
        </div>
      </LeonardoCollapsiblePanel>

      {sheetContact ? (
        <LeonardoContactSheetModal
          tenantSlug={tenantSlug}
          contact={sheetContact}
          onContactChange={(next) => {
            setContacts((current) =>
              current.map((item) => (item.id === next.id ? next : item))
            );
          }}
          onClose={() => syncContactSheet(null)}
        />
      ) : null}
    </div>
  );
}
