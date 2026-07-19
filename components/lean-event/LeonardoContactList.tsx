"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LeonardoContactImport } from "@/components/lean-event/LeonardoContactImport";
import { LeonardoContactListTable } from "@/components/lean-event/LeonardoContactListTable";
import { LeonardoContactSheetModal } from "@/components/lean-event/LeonardoContactSheetModal";
import {
  LeonardoListPagination,
  LEONARDO_DEFAULT_PAGE_SIZE,
} from "@/components/lean-event/LeonardoListPagination";
import { LeonardoListSortSelect } from "@/components/lean-event/LeonardoListSortSelect";
import {
  LeonardoPageHeader,
  LEONARDO_PAGE_ACTION_BUTTON,
  LEONARDO_PAGE_ACTION_BUTTON_SECONDARY,
  LEONARDO_PAGE_ACTION_BUTTON_SECONDARY_ACTIVE,
} from "@/components/lean-event/LeonardoPageHeader";
import { LeonardoRubricaNav } from "@/components/lean-event/LeonardoRubricaNav";
import { useLeonardoWorkTabsOptional } from "@/components/lean-event/LeonardoWorkTabsContext";
import { formatContactName } from "@/lib/lean-event/contact-display";
import { collectContactTags } from "@/lib/lean-event/contact-tags";
import {
  contactMatchesFilters,
  downloadContactsCsv,
} from "@/lib/lean-event/contact-export";
import {
  paginateList,
  type LeonardoPageSize,
} from "@/lib/lean-event/list-pagination";
import { sortContacts, type ListSortMode } from "@/lib/lean-event/list-sort";
import { useLeonardoListKeyboard } from "@/lib/lean-event/use-leonardo-list-keyboard";
import type { LeanEventContact } from "@/types/lean-event";

function emptyDraftContact(): LeanEventContact {
  return {
    id: "new",
    tenantId: "",
    firstName: "",
    lastName: "",
    email: "",
    fiscalCode: "",
    phones: [],
    organization: "",
    tags: [],
    notes: "",
    createdAt: "",
    updatedAt: "",
  };
}

type ContactSection = "list" | "import";

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
  const workTabs = useLeonardoWorkTabsOptional();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState(
    initialContacts.map((contact) => ({
      ...contact,
      tags: contact.tags ?? [],
    }))
  );
  const [section, setSection] = useState<ContactSection>("list");
  const [sheetContactId, setSheetContactId] = useState<string | null>(
    workTabs ? null : initialContactId
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
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    setContacts(
      initialContacts.map((contact) => ({
        ...contact,
        tags: contact.tags ?? [],
      }))
    );
  }, [initialContacts]);

  useEffect(() => {
    if (!initialContactId) {
      return;
    }
    if (workTabs) {
      const contact =
        contacts.find((item) => item.id === initialContactId) ??
        initialContacts.find((item) => item.id === initialContactId);
      workTabs.openTab({
        kind: "contact",
        entityId: initialContactId,
        title: contact ? formatContactName(contact) : initialContactId,
      });
      return;
    }
    setSheetContactId(initialContactId);
    // Solo deep-link iniziale: non reagire a ogni update contatti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    ? (contacts.find((item) => item.id === sheetContactId) ?? null)
    : null;

  const syncContactSheet = useCallback(
    (contactId: string | null) => {
      if (contactId && workTabs) {
        const contact = contacts.find((item) => item.id === contactId);
        workTabs.openTab({
          kind: "contact",
          entityId: contactId,
          title: contact ? formatContactName(contact) : contactId,
        });
      } else {
        setSheetContactId(contactId);
      }
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
    [contacts, pathname, router, searchParams, workTabs]
  );

  useLeonardoListKeyboard({
    enabled: section === "list" && filtered.length > 0,
    items: paginated.pageItems,
    activeId: sheetContactId,
    onSelect: syncContactSheet,
  });

  function handleContactCreated(contact: LeanEventContact) {
    setContacts((current) => {
      const withoutDupes = contact.email.trim()
        ? current.filter(
            (item) =>
              item.email.trim().toLowerCase() !==
              contact.email.trim().toLowerCase()
          )
        : current;
      return [...withoutDupes, { ...contact, tags: contact.tags ?? [] }].sort(
        (a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`,
            "it"
          )
      );
    });
    setCreateModalOpen(false);
    setError(null);
  }

  async function reloadContacts() {
    const response = await fetch("/api/lean-event/contacts", {
      credentials: "same-origin",
    });
    const payload = (await response.json()) as { contacts?: LeanEventContact[] };
    if (payload.contacts) {
      setContacts(
        payload.contacts.map((contact) => ({
          ...contact,
          tags: contact.tags ?? [],
        }))
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
      hasFilters
        ? "lean-event-rubrica-contatti-filtrato.csv"
        : "lean-event-rubrica-contatti.csv"
    );
  }

  return (
    <div className="space-y-4">
      <LeonardoPageHeader
        title="Rubrica contatti"
        subtitle={`${contacts.length} contatti · elenco paginato · scheda in popup · j/k per navigare`}
        action={
          <>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className={LEONARDO_PAGE_ACTION_BUTTON}
            >
              Aggiungi nuovo
            </button>
            <button
              type="button"
              onClick={() =>
                setSection((current) =>
                  current === "import" ? "list" : "import"
                )
              }
              className={
                section === "import"
                  ? LEONARDO_PAGE_ACTION_BUTTON_SECONDARY_ACTIVE
                  : LEONARDO_PAGE_ACTION_BUTTON_SECONDARY
              }
            >
              {section === "import"
                ? "Torna all'elenco"
                : "Importazione massiva"}
            </button>
          </>
        }
      />

      <LeonardoRubricaNav
        tenantSlug={tenantSlug}
        clientiEnabled={clientiEnabled}
      />

      {error ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {error}
        </p>
      ) : null}

      {section === "import" ? (
        <LeonardoContactImport compact onImported={reloadContacts} />
      ) : (
        <div className="space-y-4">
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
              className="rounded-md border border-white/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:border-leanme-fuchsia"
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
                  className={`rounded-md px-2.5 py-1 text-[11px] ${
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
                ? "Nessun contatto. Usa «Aggiungi nuovo» o Importazione massiva."
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
      )}

      {createModalOpen ? (
        <LeonardoContactSheetModal
          tenantSlug={tenantSlug}
          contact={emptyDraftContact()}
          mode="create"
          closeOnSuccess
          onContactChange={handleContactCreated}
          onCreated={handleContactCreated}
          onClose={() => setCreateModalOpen(false)}
        />
      ) : null}

      {sheetContact && !workTabs ? (
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
