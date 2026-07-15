import {
  formatInternalRatingLabel,
  formatStarCategoryLabel,
} from "@/lib/lean-event/venue-normalize";
import type { LeonardoVenue } from "@/types/lean-event";

function escapeCsvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadVenuesCsv(
  venues: LeonardoVenue[],
  filename = "lean-event-rubrica-sedi.csv"
): void {
  const headers = [
    "Nome",
    "Indirizzo",
    "Città",
    "Provincia",
    "CAP",
    "Telefono",
    "Email",
    "Stelle",
    "Valutazione interna",
    "Note",
  ];

  const lines = [
    headers.join(";"),
    ...venues.map((venue) =>
      [
        venue.name,
        venue.address,
        venue.city,
        venue.province,
        venue.postalCode,
        venue.phone,
        venue.email,
        formatStarCategoryLabel(venue.starCategory),
        formatInternalRatingLabel(venue.internalRating),
        venue.notes,
      ]
        .map(escapeCsvCell)
        .join(";")
    ),
  ];

  const csv = `\uFEFF${lines.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
