/** Province italiane → regione; nazioni comuni per anagrafiche. */

export const ITALIAN_REGIONS = [
  "Abruzzo",
  "Basilicata",
  "Calabria",
  "Campania",
  "Emilia-Romagna",
  "Friuli-Venezia Giulia",
  "Lazio",
  "Liguria",
  "Lombardia",
  "Marche",
  "Molise",
  "Piemonte",
  "Puglia",
  "Sardegna",
  "Sicilia",
  "Toscana",
  "Trentino-Alto Adige",
  "Umbria",
  "Valle d'Aosta",
  "Veneto",
] as const;

/** Sigla provincia → regione */
export const ITALIAN_PROVINCE_TO_REGION: Record<string, string> = {
  AG: "Sicilia",
  AL: "Piemonte",
  AN: "Marche",
  AO: "Valle d'Aosta",
  AP: "Marche",
  AQ: "Abruzzo",
  AR: "Toscana",
  AT: "Piemonte",
  AV: "Campania",
  BA: "Puglia",
  BG: "Lombardia",
  BI: "Piemonte",
  BL: "Veneto",
  BN: "Campania",
  BO: "Emilia-Romagna",
  BR: "Puglia",
  BS: "Lombardia",
  BT: "Puglia",
  BZ: "Trentino-Alto Adige",
  CA: "Sardegna",
  CB: "Molise",
  CE: "Campania",
  CH: "Abruzzo",
  CL: "Sicilia",
  CN: "Piemonte",
  CO: "Lombardia",
  CR: "Lombardia",
  CS: "Calabria",
  CT: "Sicilia",
  CZ: "Calabria",
  EN: "Sicilia",
  FC: "Emilia-Romagna",
  FE: "Emilia-Romagna",
  FG: "Puglia",
  FI: "Toscana",
  FM: "Marche",
  FR: "Lazio",
  GE: "Liguria",
  GO: "Friuli-Venezia Giulia",
  GR: "Toscana",
  IM: "Liguria",
  IS: "Molise",
  KR: "Calabria",
  LC: "Lombardia",
  LE: "Puglia",
  LI: "Toscana",
  LO: "Lombardia",
  LT: "Lazio",
  LU: "Toscana",
  MB: "Lombardia",
  MC: "Marche",
  ME: "Sicilia",
  MI: "Lombardia",
  MN: "Lombardia",
  MO: "Emilia-Romagna",
  MS: "Toscana",
  MT: "Basilicata",
  NA: "Campania",
  NO: "Piemonte",
  NU: "Sardegna",
  OR: "Sardegna",
  PA: "Sicilia",
  PC: "Emilia-Romagna",
  PD: "Veneto",
  PE: "Abruzzo",
  PG: "Umbria",
  PI: "Toscana",
  PN: "Friuli-Venezia Giulia",
  PO: "Toscana",
  PR: "Emilia-Romagna",
  PT: "Toscana",
  PU: "Marche",
  PV: "Lombardia",
  PZ: "Basilicata",
  RA: "Emilia-Romagna",
  RC: "Calabria",
  RE: "Emilia-Romagna",
  RG: "Sicilia",
  RI: "Lazio",
  RM: "Lazio",
  RN: "Emilia-Romagna",
  RO: "Veneto",
  SA: "Campania",
  SI: "Toscana",
  SO: "Lombardia",
  SP: "Liguria",
  SR: "Sicilia",
  SS: "Sardegna",
  SU: "Sardegna",
  SV: "Liguria",
  TA: "Puglia",
  TE: "Abruzzo",
  TN: "Trentino-Alto Adige",
  TO: "Piemonte",
  TP: "Sicilia",
  TR: "Umbria",
  TS: "Friuli-Venezia Giulia",
  TV: "Veneto",
  UD: "Friuli-Venezia Giulia",
  VA: "Lombardia",
  VB: "Piemonte",
  VC: "Piemonte",
  VE: "Veneto",
  VI: "Veneto",
  VR: "Veneto",
  VT: "Lazio",
  VV: "Calabria",
};

export const ITALIAN_PROVINCE_CODES = Object.keys(ITALIAN_PROVINCE_TO_REGION).sort();

export const COMMON_COUNTRIES = [
  "Italia",
  "San Marino",
  "Città del Vaticano",
  "Svizzera",
  "Francia",
  "Germania",
  "Austria",
  "Spagna",
  "Portogallo",
  "Regno Unito",
  "Belgio",
  "Paesi Bassi",
  "Lussemburgo",
  "Irlanda",
  "Grecia",
  "Polonia",
  "Repubblica Ceca",
  "Slovacchia",
  "Slovenia",
  "Croazia",
  "Romania",
  "Ungheria",
  "Bulgaria",
  "Svezia",
  "Norvegia",
  "Danimarca",
  "Finlandia",
  "Stati Uniti",
  "Canada",
  "Brasile",
  "Argentina",
  "Cina",
  "Giappone",
  "India",
  "Australia",
  "Emirati Arabi Uniti",
  "Altro",
] as const;

export const DEFAULT_COUNTRY = "Italia";

export function isItalyCountry(country: string | undefined | null): boolean {
  const normalized = (country ?? "").trim().toLowerCase();
  return (
    !normalized ||
    normalized === "italia" ||
    normalized === "italy" ||
    normalized === "it"
  );
}

export function regionFromItalianProvince(
  province: string | undefined | null
): string {
  const code = (province ?? "").trim().toUpperCase();
  return ITALIAN_PROVINCE_TO_REGION[code] ?? "";
}

export type AddressFieldsValue = {
  address: string;
  city: string;
  province: string;
  region: string;
  postalCode: string;
  country: string;
};

export function emptyAddressFields(
  country: string = DEFAULT_COUNTRY
): AddressFieldsValue {
  return {
    address: "",
    city: "",
    province: "",
    region: "",
    postalCode: "",
    country,
  };
}

export function normalizeAddressFields(
  value?: Partial<AddressFieldsValue> | null
): AddressFieldsValue {
  const country = value?.country?.trim() || DEFAULT_COUNTRY;
  const provinceRaw = value?.province?.trim() ?? "";
  const province = isItalyCountry(country)
    ? provinceRaw.toUpperCase()
    : provinceRaw;
  const regionRaw = value?.region?.trim() ?? "";
  const region = isItalyCountry(country)
    ? regionRaw || regionFromItalianProvince(province)
    : "";
  return {
    address: value?.address?.trim() ?? "",
    city: value?.city?.trim() ?? "",
    province,
    region,
    postalCode: value?.postalCode?.trim() ?? "",
    country,
  };
}
