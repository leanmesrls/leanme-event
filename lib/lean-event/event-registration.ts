import type {
  LeonardoEventRegistration,
  LeonardoEventRegistrationFee,
} from "@/types/lean-event";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fee_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyRegistrationFee(): LeonardoEventRegistrationFee {
  return {
    id: newId(),
    label: "",
    amount: "",
    validFrom: "",
    validTo: "",
    notes: "",
  };
}

export function emptyEventRegistration(): LeonardoEventRegistration {
  return {
    paid: null,
    fees: [],
    refundsEnabled: null,
    refundRules: "",
  };
}

export function normalizeEventRegistration(
  value?: Partial<LeonardoEventRegistration> | null
): LeonardoEventRegistration {
  const base = emptyEventRegistration();
  if (!value) {
    return base;
  }
  const fees = Array.isArray(value.fees)
    ? value.fees.map((fee) => ({
        id: fee.id?.trim() || newId(),
        label: fee.label?.trim() ?? "",
        amount: fee.amount?.trim() ?? "",
        validFrom: fee.validFrom?.trim() ?? "",
        validTo: fee.validTo?.trim() ?? "",
        notes: fee.notes?.trim() ?? "",
      }))
    : [];
  return {
    paid: value.paid === undefined ? null : value.paid,
    fees: value.paid ? fees : [],
    refundsEnabled:
      value.refundsEnabled === undefined ? null : value.refundsEnabled,
    refundRules:
      value.refundsEnabled === true ? value.refundRules?.trim() ?? "" : "",
  };
}
