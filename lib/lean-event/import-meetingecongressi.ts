import type { LeanEventImportResult, LeanEventSession } from "@/types/lean-event";

import {
  getMeetingCongressiByLinks,
  loadMeetingCongressiCatalog,
  mapMeetingCongressiToVenueInput,
  type MeetingCongressiCatalogEntry,
} from "./meetingecongressi-catalog";
import { venueIdentityKey } from "./venue-storage";
import { createVenue, listVenues, saveVenue } from "./venues";

async function importCatalogEntries(
  session: LeanEventSession,
  locations: MeetingCongressiCatalogEntry[]
): Promise<LeanEventImportResult> {
  const result: LeanEventImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const existing = await listVenues(session.tenantId);
  const existingUrls = new Set(
    existing
      .map((venue) => venue.externalUrl.trim().toLowerCase())
      .filter(Boolean)
  );
  const existingIdentities = new Set(
    existing.map((venue) => venueIdentityKey(venue))
  );

  for (let index = 0; index < locations.length; index += 1) {
    const location = locations[index]!;
    const input = mapMeetingCongressiToVenueInput(location);

    if (!input.name || !input.address || !input.city) {
      result.errors.push({
        row: index + 1,
        message: `Dati insufficienti per ${input.name || location.link_pagina}.`,
      });
      continue;
    }

    const externalKey = input.externalUrl.trim().toLowerCase();
    if (externalKey && existingUrls.has(externalKey)) {
      result.skipped += 1;
      continue;
    }

    const identityKey = venueIdentityKey(input);
    if (existingIdentities.has(identityKey)) {
      result.skipped += 1;
      continue;
    }

    const venue = createVenue(session, input);
    await saveVenue(venue);
    result.created += 1;

    if (externalKey) {
      existingUrls.add(externalKey);
    }
    existingIdentities.add(identityKey);
  }

  return result;
}

export async function importMeetingCongressiVenues(
  session: LeanEventSession,
  links: string[]
): Promise<LeanEventImportResult> {
  const uniqueLinks = [...new Set(links.map((link) => link.trim()).filter(Boolean))];
  if (uniqueLinks.length === 0) {
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, message: "Nessuna sede selezionata." }],
    };
  }

  const locations = await getMeetingCongressiByLinks(uniqueLinks);
  const foundLinks = new Set(
    locations.map((item) => item.link_pagina.trim().toLowerCase())
  );

  const result = await importCatalogEntries(session, locations);

  for (const link of uniqueLinks) {
    if (!foundLinks.has(link.toLowerCase())) {
      result.errors.push({
        row: 0,
        message: `Sede non trovata nel catalogo: ${link}`,
      });
    }
  }

  return result;
}

export async function importAllMeetingCongressiCatalog(
  session: LeanEventSession
): Promise<LeanEventImportResult & { totalInCatalog: number }> {
  const catalog = await loadMeetingCongressiCatalog();
  const result = await importCatalogEntries(session, catalog);

  return {
    ...result,
    totalInCatalog: catalog.length,
  };
}
