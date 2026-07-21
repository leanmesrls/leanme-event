#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import * as XLSX from "xlsx";

const root = process.cwd();
const outDir = path.join(root, "public", "assets", "lean-event", "import");

const CONTACT_HEADERS = [
  "Vocativo",
  "Titolo",
  "Cognome",
  "Nome",
  "Email",
  "Etichetta email",
  "Email 2",
  "Etichetta email 2",
  "Codice fiscale",
  "Telefono",
  "Etichetta telefono",
  "Telefono 2",
  "Etichetta telefono 2",
  "Data di nascita",
  "Tag",
  "Indirizzo",
  "Città",
  "Provincia",
  "Regione",
  "CAP",
  "Nazione",
  "Organizzazione",
  "Indirizzo ente",
  "Città ente",
  "Provincia ente",
  "Regione ente",
  "CAP ente",
  "Nazione ente",
  "Ruolo aziendale",
  "Preferenze alimentari",
  "Mobilità ridotta",
  "Richieste personali",
  "Note",
];

const CONTACT_EXAMPLE = [
  "Egregio",
  "Dottore",
  "Rossi",
  "Mario",
  "mario.rossi@esempio.it",
  "Principale",
  "",
  "",
  "RSSMRA80A01H501Z",
  "+39 051 1234567",
  "Principale",
  "",
  "",
  "01/01/1980",
  "docente, sponsor",
  "Via Roma 1",
  "Bologna",
  "BO",
  "Emilia-Romagna",
  "40121",
  "Italia",
  "I&C srl",
  "Via dell'Industria 10",
  "Bologna",
  "BO",
  "Emilia-Romagna",
  "40127",
  "Italia",
  "Dirigente",
  "Vegetariano",
  "",
  "",
  "Riga di esempio — puoi eliminarla",
];

const VENUE_HEADERS = [
  "Nome sede",
  "Indirizzo sede",
  "Città",
  "Provincia sede",
  "CAP",
  "Telefono",
  "Email",
  "Sito web",
  "URL scheda esterna",
  "URL immagine",
  "Note",
];

const VENUE_EXAMPLE = [
  "UNA Hotel Bologna",
  "Via Pietramellara 41",
  "Bologna",
  "BO",
  "40121",
  "+39 051 7450311",
  "info@unahotels.it",
  "https://www.unahotels.it",
  "https://www.meetingecongressi.com/it/location/...",
  "https://…/foto-hotel.jpg",
  "Riga di esempio — puoi eliminarla",
];

const SUPPLIER_HEADERS = [
  "Nome fornitore",
  "Categoria",
  "Email",
  "Telefono",
  "Indirizzo",
  "Città",
  "Provincia",
  "Partita IVA",
  "Referente",
  "Note",
];

const SUPPLIER_EXAMPLE = [
  "Audio Light Service",
  "tecnici",
  "info@audiolight.esempio.it",
  "+39 02 1234567",
  "Via Roma 1",
  "Milano",
  "MI",
  "12345678901",
  "Luca Bianchi",
  "Riga di esempio — puoi eliminarla",
];

const EVENT_HEADERS = [
  "Titolo",
  "CDC",
  "Data inizio",
  "Data fine",
  "Sede",
  "Stato",
  "Note",
];

const EVENT_EXAMPLE = [
  "Congresso Nazionale 2026",
  "CDC-2026-001",
  "2026-09-10",
  "2026-09-12",
  "UNA Hotel Bologna",
  "draft",
  "Riga di esempio — puoi eliminarla",
];

function instructionLines(kind) {
  if (kind === "contacts") {
    return [
      ["Lean Event — Importazione rubrica contatti"],
      [""],
      ["Foglio «Dati»: una riga = un contatto."],
      ["Obbligatori: Nome, Cognome."],
      ["Email duplicata: confronto campo per campo (email o CF)."],
      ["Salva come .xlsx e carica da Rubrica contatti → Importa."],
      ["Formati accettati: .xlsx, .csv (separatore ; o ,)"],
    ];
  }
  if (kind === "venues") {
    return [
      ["Lean Event — Importazione rubrica sedi"],
      [""],
      ["Foglio «Dati»: una riga = una sede."],
      ["Obbligatori: Nome sede, Indirizzo sede, Città, Provincia sede."],
      ["Sede già presente (stesso nome+indirizzo+città): riga saltata."],
      ["Formati accettati: .xlsx, .csv (separatore ; o ,)"],
    ];
  }
  if (kind === "suppliers") {
    return [
      ["Lean Event — Importazione fornitori"],
      [""],
      ["Foglio «Dati»: una riga = un fornitore."],
      ["Obbligatorio: Nome fornitore."],
      ["Categoria: id categoria Lean Event (es. tecnici, hotel, collaboratori)."],
      ["Duplicati (stesso nome+email): riga saltata."],
      ["API: POST /api/lean-event/suppliers/import"],
    ];
  }
  return [
    ["Lean Event — Importazione eventi"],
    [""],
    ["Foglio «Dati»: una riga = un evento."],
    ["Obbligatori: Titolo, Data inizio (YYYY-MM-DD o formato IT)."],
    ["Stato: draft | active | completed (default draft)."],
    ["Duplicati (stesso titolo+date): riga saltata."],
    ["API: POST /api/lean-event/events/import"],
  ];
}

function buildWorkbook(kind, headers, exampleRow) {
  const wb = XLSX.utils.book_new();
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionLines(kind));
  const wsData = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

  wsInstructions["!cols"] = [{ wch: 72 }];
  wsData["!cols"] = headers.map(() => ({ wch: 22 }));

  XLSX.utils.book_append_sheet(wb, wsInstructions, "Istruzioni");
  XLSX.utils.book_append_sheet(wb, wsData, "Dati");
  return wb;
}

async function writePair(basename, headers, example, kind) {
  const wb = buildWorkbook(kind, headers, example);
  const xlsxPath = path.join(outDir, `${basename}.xlsx`);
  XLSX.writeFile(wb, xlsxPath);
  const csv = [headers.join(";"), example.join(";")].join("\n");
  await writeFile(path.join(outDir, `${basename}.csv`), `\uFEFF${csv}`, "utf8");
  console.log(`  ${xlsxPath}`);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  console.log("Modelli import Lean Event generati:");
  await writePair(
    "lean-event-rubrica-contatti",
    CONTACT_HEADERS,
    CONTACT_EXAMPLE,
    "contacts"
  );
  await writePair(
    "lean-event-rubrica-sedi",
    VENUE_HEADERS,
    VENUE_EXAMPLE,
    "venues"
  );
  await writePair(
    "lean-event-rubrica-fornitori",
    SUPPLIER_HEADERS,
    SUPPLIER_EXAMPLE,
    "suppliers"
  );
  await writePair(
    "lean-event-elenco-eventi",
    EVENT_HEADERS,
    EVENT_EXAMPLE,
    "events"
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
