"use client";

import { LeonardoCreatableSelect } from "@/components/lean-event/LeonardoCreatableSelect";
import {
  COMMON_COUNTRIES,
  ITALIAN_PROVINCE_CODES,
  ITALIAN_REGIONS,
  isItalyCountry,
  regionFromItalianProvince,
  type AddressFieldsValue,
} from "@/lib/lean-event/geo-italy";
import { cn } from "@/lib/utils";

interface LeonardoAddressFieldsProps {
  value: AddressFieldsValue;
  onChange: (value: AddressFieldsValue) => void;
  className?: string;
  /** Prefisso etichette (es. "ente") */
  labelPrefix?: string;
  showAddress?: boolean;
}

const inputClass =
  "w-full rounded-lg border border-white/15 bg-black px-3 py-2.5 text-sm outline-none focus:border-leanme-fuchsia";

/**
 * Blocco indirizzo uniforme (modello Italia).
 * Ordine: Nazione → Indirizzo → Città → Provincia → Regione (solo IT) → CAP.
 */
export function LeonardoAddressFields({
  value,
  onChange,
  className,
  labelPrefix = "",
  showAddress = true,
}: LeonardoAddressFieldsProps) {
  const italy = isItalyCountry(value.country);
  const prefix = labelPrefix ? `${labelPrefix} ` : "";

  function patch(partial: Partial<AddressFieldsValue>) {
    const next = { ...value, ...partial };

    if (partial.country !== undefined) {
      if (!isItalyCountry(partial.country)) {
        next.region = "";
      } else if (!next.region) {
        next.region = regionFromItalianProvince(next.province);
      }
    }

    if (partial.province !== undefined && isItalyCountry(next.country)) {
      const mapped = regionFromItalianProvince(partial.province);
      if (mapped) {
        next.region = mapped;
      }
      next.province = partial.province.trim().toUpperCase();
    }

    onChange(next);
  }

  return (
    <div className={cn("grid gap-3 md:grid-cols-2", className)}>
      <LeonardoCreatableSelect
        className="md:col-span-2"
        label={`${prefix}Nazione`}
        value={value.country}
        options={COMMON_COUNTRIES}
        onChange={(country) => patch({ country })}
        placeholder="Nazione"
        allowEmpty={false}
      />

      {showAddress ? (
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-white/60">{prefix}Indirizzo</span>
          <input
            value={value.address}
            onChange={(event) => patch({ address: event.target.value })}
            className={inputClass}
          />
        </label>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1 block text-white/60">{prefix}Città</span>
        <input
          value={value.city}
          onChange={(event) => patch({ city: event.target.value })}
          className={inputClass}
        />
      </label>

      {italy ? (
        <LeonardoCreatableSelect
          label={`${prefix}Provincia`}
          value={value.province}
          options={ITALIAN_PROVINCE_CODES}
          onChange={(province) => patch({ province })}
          placeholder="Sigla (es. BO)"
        />
      ) : (
        <label className="block text-sm">
          <span className="mb-1 block text-white/60">{prefix}Provincia</span>
          <input
            value={value.province}
            onChange={(event) => patch({ province: event.target.value })}
            placeholder="Provincia / area (testo libero)"
            className={inputClass}
          />
        </label>
      )}

      {italy ? (
        <LeonardoCreatableSelect
          label={`${prefix}Regione`}
          value={value.region}
          options={ITALIAN_REGIONS}
          onChange={(region) => patch({ region })}
          placeholder="Regione italiana"
        />
      ) : null}

      <label className="block text-sm">
        <span className="mb-1 block text-white/60">{prefix}CAP</span>
        <input
          value={value.postalCode}
          onChange={(event) => patch({ postalCode: event.target.value })}
          className={inputClass}
        />
      </label>
    </div>
  );
}
