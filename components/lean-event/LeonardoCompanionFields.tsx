"use client";

import {
  companionFromContact,
  formatCompanionName,
  normalizeCompanionPerson,
} from "@/lib/lean-event/companion";
import type { LeanEventContact, LeonardoCompanionPerson } from "@/types/lean-event";

export interface CompanionFieldValue extends LeonardoCompanionPerson {
  contactId: string | null;
}

interface ParticipantOption {
  id: string;
  label: string;
  contact: LeanEventContact;
}

interface LeonardoCompanionFieldsProps {
  title?: string;
  value: CompanionFieldValue;
  participantOptions?: ParticipantOption[];
  onChange: (value: CompanionFieldValue) => void;
  disabled?: boolean;
}

export function emptyCompanionFieldValue(
  partial?: Partial<CompanionFieldValue>
): CompanionFieldValue {
  const person = normalizeCompanionPerson(partial ?? undefined);
  return {
    ...person,
    contactId: partial?.contactId ?? null,
  };
}

export function LeonardoCompanionFields({
  title = "Accompagnatore",
  value,
  participantOptions = [],
  onChange,
  disabled = false,
}: LeonardoCompanionFieldsProps) {
  const linkedParticipant = participantOptions.find(
    (option) => option.id === value.contactId
  );

  function updatePerson(patch: Partial<LeonardoCompanionPerson>) {
    onChange({
      ...value,
      ...patch,
      contactId: value.contactId,
    });
  }

  function selectParticipant(contactId: string) {
    if (!contactId) {
      onChange(emptyCompanionFieldValue({ contactId: null }));
      return;
    }
    const option = participantOptions.find((item) => item.id === contactId);
    if (!option) {
      onChange({ ...value, contactId: null });
      return;
    }
    onChange({
      ...companionFromContact(option.contact),
      contactId,
    });
  }

  return (
    <div className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 md:grid-cols-2">
      <p className="md:col-span-2 text-xs font-semibold uppercase tracking-[0.1em] text-white/50">
        {title}
      </p>

      {participantOptions.length > 0 ? (
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-white/60">
            Da elenco partecipanti evento
          </span>
          <select
            value={value.contactId ?? ""}
            disabled={disabled}
            onChange={(event) => selectParticipant(event.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia disabled:opacity-60"
          >
            <option value="">Nessuno — compila manualmente sotto</option>
            {participantOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1 block text-white/60">Nome</span>
        <input
          value={value.firstName}
          disabled={disabled || Boolean(value.contactId)}
          onChange={(event) => updatePerson({ firstName: event.target.value })}
          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia disabled:opacity-60"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-white/60">Cognome</span>
        <input
          value={value.lastName}
          disabled={disabled || Boolean(value.contactId)}
          onChange={(event) => updatePerson({ lastName: event.target.value })}
          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia disabled:opacity-60"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-white/60">Telefono (facoltativo)</span>
        <input
          value={value.phone}
          disabled={disabled || Boolean(value.contactId)}
          onChange={(event) => updatePerson({ phone: event.target.value })}
          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia disabled:opacity-60"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-white/60">Email (facoltativa)</span>
        <input
          type="email"
          value={value.email}
          disabled={disabled || Boolean(value.contactId)}
          onChange={(event) => updatePerson({ email: event.target.value })}
          className="w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia disabled:opacity-60"
        />
      </label>

      {linkedParticipant ? (
        <p className="md:col-span-2 text-xs text-white/45">
          Dati da partecipante: {formatCompanionName(value)}
        </p>
      ) : null}
    </div>
  );
}
