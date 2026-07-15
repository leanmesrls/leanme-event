import { readFile } from "node:fs/promises";
import path from "node:path";

export interface MeetingCongressiLocation {
  nome_sede: string;
  indirizzo: string;
  citta: string;
  cap: string;
  provincia: string;
  regione: string;
  link_pagina: string;
  foto_principale: string;
  tipo_struttura: string;
  categoria: string;
  camere_disponibili: string;
  numero_sale: string;
  capacita_massime: string;
}

export interface MeetingCongressiCatalogEntry extends MeetingCongressiLocation {
  catalogId: string;
}

export interface MeetingCongressiSearchParams {
  query?: string;
  region?: string;
  city?: string;
  limit?: number;
  offset?: number;
}

export interface MeetingCongressiSearchResult {
  total: number;
  items: MeetingCongressiCatalogEntry[];
  regions: string[];
}

let catalogCache: MeetingCongressiCatalogEntry[] | null = null;

function catalogFilePath(): string {
  return path.join(
    process.cwd(),
    "data",
    "leanyou",
    "meetingecongressi-locations.json"
  );
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function buildCatalogId(link: string): string {
  return link.trim().toLowerCase();
}

function buildNotes(location: MeetingCongressiLocation): string {
  const parts = [
    location.tipo_struttura,
    location.regione ? `Regione: ${location.regione}` : "",
    location.camere_disponibili
      ? `Camere: ${location.camere_disponibili}`
      : "",
    location.numero_sale ? `Sale: ${location.numero_sale}` : "",
    location.capacita_massime
      ? `Capacità sale: ${location.capacita_massime}`
      : "",
    "Fonte: Meeting e Congressi",
  ].filter(Boolean);

  return parts.join(" · ");
}

export function mapMeetingCongressiToVenueInput(
  location: MeetingCongressiLocation
): {
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  externalUrl: string;
  coverImageUrl: string;
  starCategory: string;
  notes: string;
} {
  return {
    name: location.nome_sede.trim(),
    address: location.indirizzo.trim(),
    city: location.citta.trim(),
    province: location.provincia.trim().toUpperCase(),
    postalCode: location.cap.trim(),
    externalUrl: location.link_pagina.trim(),
    coverImageUrl: location.foto_principale.trim(),
    starCategory: location.categoria.trim(),
    notes: buildNotes(location),
  };
}

export async function loadMeetingCongressiCatalog(): Promise<
  MeetingCongressiCatalogEntry[]
> {
  if (catalogCache) {
    return catalogCache;
  }

  const raw = await readFile(catalogFilePath(), "utf8");
  const parsed = JSON.parse(raw) as MeetingCongressiLocation[];

  catalogCache = parsed
    .filter((item) => item.link_pagina?.trim() && item.nome_sede?.trim())
    .map((item) => ({
      ...item,
      catalogId: buildCatalogId(item.link_pagina),
    }));

  return catalogCache;
}

export async function searchMeetingCongressiCatalog(
  params: MeetingCongressiSearchParams = {}
): Promise<MeetingCongressiSearchResult> {
  const catalog = await loadMeetingCongressiCatalog();
  const query = normalizeSearchText(params.query ?? "");
  const region = normalizeSearchText(params.region ?? "");
  const city = normalizeSearchText(params.city ?? "");
  const limit = Math.min(Math.max(params.limit ?? 30, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);

  const regions = [
    ...new Set(
      catalog
        .map((item) => item.regione.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "it"))
    ),
  ];

  const filtered = catalog.filter((item) => {
    if (region && normalizeSearchText(item.regione) !== region) {
      return false;
    }
    if (city && !normalizeSearchText(item.citta).includes(city)) {
      return false;
    }
    if (!query) {
      return true;
    }

    const haystack = normalizeSearchText(
      [
        item.nome_sede,
        item.citta,
        item.provincia,
        item.regione,
        item.indirizzo,
        item.tipo_struttura,
        item.categoria,
      ].join(" ")
    );

    return haystack.includes(query);
  });

  return {
    total: filtered.length,
    items: filtered.slice(offset, offset + limit),
    regions,
  };
}

export async function getMeetingCongressiByLinks(
  links: string[]
): Promise<MeetingCongressiCatalogEntry[]> {
  const catalog = await loadMeetingCongressiCatalog();
  const wanted = new Set(links.map((link) => buildCatalogId(link)));

  return catalog.filter((item) => wanted.has(item.catalogId));
}
