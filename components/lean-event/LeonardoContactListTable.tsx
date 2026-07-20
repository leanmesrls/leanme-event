"use client";

import { LeonardoEntityId } from "@/components/lean-event/LeonardoEntityId";
import {
  LEONARDO_LIST_NAME_CELL,
  LEONARDO_LIST_NAME_LINK,
  LEONARDO_LIST_STICKY_HEADER,
} from "@/components/lean-event/leonardo-ui";
import { LeonardoVirtualList } from "@/components/lean-event/LeonardoVirtualList";
import {
  formatContactName,
  formatContactOrganizationProvince,
  getContactPrimaryPhone,
} from "@/lib/lean-event/contact-display";
import { formatTagsDisplay } from "@/lib/lean-event/contact-tags";
import type { LeanEventContact } from "@/types/lean-event";

const VIRTUAL_ROW_HEIGHT = 64;
const VIRTUAL_LIST_HEIGHT = 560;

interface LeonardoContactListTableProps {
  contacts: LeanEventContact[];
  activeContactId: string | null;
  onOpenSheet: (contactId: string) => void;
  virtualScroll?: boolean;
}

function ContactListHeader() {
  return (
    <thead>
      <tr className={LEONARDO_LIST_STICKY_HEADER}>
        <th className="px-3 py-2.5">Nome</th>
        <th className="hidden px-3 py-2.5 sm:table-cell">Tel. principale</th>
        <th className="hidden px-3 py-2.5 md:table-cell">Email</th>
        <th className="hidden px-3 py-2.5 lg:table-cell">Tag</th>
        <th className="hidden px-3 py-2.5 xl:table-cell">Prov. ente</th>
        <th className="px-3 py-2.5 text-right">Scheda</th>
      </tr>
    </thead>
  );
}

function ContactRow({
  contact,
  isActive,
  onOpenSheet,
  asTableRow = true,
}: {
  contact: LeanEventContact;
  isActive: boolean;
  onOpenSheet: (contactId: string) => void;
  asTableRow?: boolean;
}) {
  const rowClass = `border-t border-white/10 transition ${
    isActive ? "bg-leanme-fuchsia/10" : "bg-[#111111] hover:bg-white/[0.03]"
  }`;

  const cells = (
    <>
      <td className={`px-3 py-2.5 ${LEONARDO_LIST_NAME_CELL}`}>
        <button
          type="button"
          title={formatContactName(contact)}
          onClick={() => onOpenSheet(contact.id)}
          className={`${LEONARDO_LIST_NAME_LINK} w-full text-left`}
        >
          {formatContactName(contact)}
        </button>
        <LeonardoEntityId id={contact.id} />
        <p className="mt-0.5 truncate text-xs text-white/45 sm:hidden">
          {getContactPrimaryPhone(contact)} · {contact.email || "—"}
        </p>
      </td>
      <td className="hidden px-3 py-2.5 text-white/70 sm:table-cell">
        {getContactPrimaryPhone(contact)}
      </td>
      <td className="hidden px-3 py-2.5 text-white/70 md:table-cell">
        {contact.email || "—"}
      </td>
      <td className="hidden px-3 py-2.5 lg:table-cell">
        {contact.tags?.length ? (
          <span className="truncate text-white/60">
            {formatTagsDisplay(contact.tags)}
          </span>
        ) : (
          <span className="text-white/40">—</span>
        )}
      </td>
      <td className="hidden px-3 py-2.5 text-white/70 xl:table-cell">
        {formatContactOrganizationProvince(contact)}
      </td>
      <td className="px-3 py-2.5 text-right">
        <button
          type="button"
          onClick={() => onOpenSheet(contact.id)}
          className="text-[10px] font-semibold uppercase tracking-[0.08em] text-leanme-fuchsia hover:underline"
        >
          Apri
        </button>
      </td>
    </>
  );

  if (!asTableRow) {
    return (
      <div className={`px-3 py-2.5 ${rowClass}`}>
        <table className="w-full text-sm">
          <tbody>
            <tr>{cells}</tr>
          </tbody>
        </table>
      </div>
    );
  }

  return <tr className={rowClass}>{cells}</tr>;
}

export function LeonardoContactListTable({
  contacts,
  activeContactId,
  onOpenSheet,
  virtualScroll = false,
}: LeonardoContactListTableProps) {
  if (virtualScroll) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <ContactListHeader />
          </table>
        </div>
        <LeonardoVirtualList
          items={contacts}
          itemHeight={VIRTUAL_ROW_HEIGHT}
          height={VIRTUAL_LIST_HEIGHT}
          className="border-t border-white/10 bg-[#111111]"
          getKey={(item) => item.id}
          renderItem={(contact) => (
            <ContactRow
              contact={contact}
              isActive={activeContactId === contact.id}
              onOpenSheet={onOpenSheet}
              asTableRow={false}
            />
          )}
        />
      </div>
    );
  }

  return (
    <div className="max-h-[560px] overflow-auto rounded-xl border border-white/10">
      <table className="min-w-[920px] w-full text-sm">
        <ContactListHeader />
        <tbody>
          {contacts.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              isActive={activeContactId === contact.id}
              onOpenSheet={onOpenSheet}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
