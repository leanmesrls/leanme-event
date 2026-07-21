"use client";

import { normalizeEcmGrid } from "@/lib/lean-event/ecm-grid";
import type {
  LeonardoEcmGrid,
  LeonardoEcmGridPerson,
  LeanEventContact,
} from "@/types/lean-event";
import { formatContactName } from "@/lib/lean-event/contact-display";

function PersonFields({
  title,
  value,
  onChange,
  contacts,
}: {
  title: string;
  value: LeonardoEcmGridPerson;
  onChange: (value: LeonardoEcmGridPerson) => void;
  contacts: LeanEventContact[];
}) {
  function patch(partial: Partial<LeonardoEcmGridPerson>) {
    onChange({ ...value, ...partial });
  }

  function pickContact(contactId: string) {
    if (!contactId) {
      patch({ contactId: null });
      return;
    }
    const contact = contacts.find((item) => item.id === contactId);
    if (!contact) {
      return;
    }
    const [firstName, ...rest] = (contact.firstName
      ? [contact.firstName, contact.lastName]
      : formatContactName(contact).split(" ")
    ).filter(Boolean);
    patch({
      contactId,
      firstName: contact.firstName || firstName || "",
      lastName: contact.lastName || rest.join(" ") || "",
      email: contact.email || value.email || "",
      fiscalCode: value.fiscalCode,
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50">
        {title}
      </p>
      <label className="block text-sm">
        <span className="mb-1 block text-white/60">Dalla rubrica contatti</span>
        <select
          value={value.contactId ?? ""}
          onChange={(e) => pickContact(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
        >
          <option value="">Seleziona contatto…</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {formatContactName(contact)}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">Cognome</span>
          <input
            value={value.lastName}
            onChange={(e) => patch({ lastName: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">Nome</span>
          <input
            value={value.firstName}
            onChange={(e) => patch({ firstName: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-white/60">Codice fiscale</span>
          <input
            value={value.fiscalCode}
            onChange={(e) => patch({ fiscalCode: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm uppercase outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-white/60">Qualifica</span>
          <input
            value={value.qualification ?? ""}
            onChange={(e) => patch({ qualification: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-white/60">E-mail</span>
          <input
            type="email"
            value={value.email ?? ""}
            onChange={(e) => patch({ email: e.target.value })}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-leanme-fuchsia"
          />
        </label>
      </div>
    </div>
  );
}

function emptyPerson(): LeonardoEcmGridPerson {
  return {
    contactId: null,
    lastName: "",
    firstName: "",
    fiscalCode: "",
    phone: "",
    mobile: "",
    email: "",
    qualification: "",
  };
}

interface LeonardoEcmFacultyFormProps {
  value: LeonardoEcmGrid;
  contacts: LeanEventContact[];
  onChange: (value: LeonardoEcmGrid) => void;
}

export function LeonardoEcmFacultyForm({
  value,
  contacts,
  onChange,
}: LeonardoEcmFacultyFormProps) {
  const grid = normalizeEcmGrid(value);

  function patch(partial: Partial<LeonardoEcmGrid>) {
    onChange(normalizeEcmGrid({ ...grid, ...partial }));
  }

  const sortedContacts = [...contacts].sort((a, b) =>
    formatContactName(a).localeCompare(formatContactName(b), "it")
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Responsabili scientifici
        </p>
        {grid.scientificLeads.map((lead, index) => (
          <div key={`lead-${index}`} className="space-y-2">
            <PersonFields
              title={`Responsabile scientifico ${index + 1}`}
              value={lead}
              contacts={sortedContacts}
              onChange={(next) => {
                const scientificLeads = [...grid.scientificLeads];
                scientificLeads[index] = next;
                patch({ scientificLeads });
              }}
            />
            {grid.scientificLeads.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  patch({
                    scientificLeads: grid.scientificLeads.filter(
                      (_, i) => i !== index
                    ),
                  })
                }
                className="text-xs text-white/50 underline hover:text-white"
              >
                Rimuovi
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            patch({
              scientificLeads: [...grid.scientificLeads, emptyPerson()],
            })
          }
          className="rounded-md border border-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 hover:border-white hover:text-white"
        >
          Aggiungi responsabile scientifico
        </button>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-black/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leanme-fuchsia">
          Comitato scientifico
        </p>
        {(grid.scientificCommittee ?? []).map((member, index) => (
          <div key={`committee-${index}`} className="space-y-2">
            <PersonFields
              title={`Membro comitato ${index + 1}`}
              value={member}
              contacts={sortedContacts}
              onChange={(next) => {
                const scientificCommittee = [
                  ...(grid.scientificCommittee ?? []),
                ];
                scientificCommittee[index] = next;
                patch({ scientificCommittee });
              }}
            />
            <button
              type="button"
              onClick={() =>
                patch({
                  scientificCommittee: (grid.scientificCommittee ?? []).filter(
                    (_, i) => i !== index
                  ),
                })
              }
              className="text-xs text-white/50 underline hover:text-white"
            >
              Rimuovi
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            patch({
              scientificCommittee: [
                ...(grid.scientificCommittee ?? []),
                emptyPerson(),
              ],
            })
          }
          className="rounded-md border border-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 hover:border-white hover:text-white"
        >
          Aggiungi membro comitato
        </button>
      </div>

      <p className="text-xs text-white/40">
        Faculty/speakers per viaggio e ospitalità: gestiscili anche in
        Anagrafiche → Speakers (ruoli relatore, moderatore, chair, discussant).
      </p>
    </div>
  );
}
