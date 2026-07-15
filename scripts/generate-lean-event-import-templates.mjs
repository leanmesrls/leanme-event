#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import * as XLSX from "xlsx";

const root = process.cwd();
const outDir = path.join(root, "public", "assets", "lean-event", "import");

const CONTACT_HEADERS = [
  "Nome",
  "Cognome",
  "Email",
  "Codice fiscale",
  "Telefono",
  "Etichetta telefono",
  "Telefono 2",
  "Etichetta telefono 2",
  "Organizzazione",
  "Tag",
  "Note",
];

const CONTACT_EXAMPLE = [
  "Mario",
  "Rossi",
  "mario.rossi@esempio.it",
  "RSSMRA80A01H501Z",
  "+39 051 1234567",
  "Principale",
  "",
  "",
  "I&C srl",
  "docente, sponsor",
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

  return [
    ["Lean Event — Importazione rubrica sedi"],
    [""],
    ["Foglio «Dati»: una riga = una sede."],
    ["Obbligatori: Nome sede, Indirizzo sede, Città, Provincia sede."],
    ["Sede già presente (stesso nome+indirizzo+città): riga saltata."],
    ["URL scheda esterna: link opzionale (es. MeetingeCongressi)."],
    ["URL immagine: copertina sede (link diretto a JPG/PNG/WebP)."],
    ["Salva come .xlsx e carica quando disponibile l'import sedi."],
    ["Formati accettati: .xlsx, .csv (separatore ; o ,)"],
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

async function main() {
  await mkdir(outDir, { recursive: true });

  const contactsWb = buildWorkbook("contacts", CONTACT_HEADERS, CONTACT_EXAMPLE);
  const venuesWb = buildWorkbook("venues", VENUE_HEADERS, VENUE_EXAMPLE);

  const contactsPath = path.join(outDir, "lean-event-rubrica-contatti.xlsx");
  const venuesPath = path.join(outDir, "lean-event-rubrica-sedi.xlsx");

  XLSX.writeFile(contactsWb, contactsPath);
  XLSX.writeFile(venuesWb, venuesPath);

  const contactsCsv = [CONTACT_HEADERS.join(";"), CONTACT_EXAMPLE.join(";")].join(
    "\n"
  );
  const venuesCsv = [VENUE_HEADERS.join(";"), VENUE_EXAMPLE.join(";")].join("\n");

  await writeFile(
    path.join(outDir, "lean-event-rubrica-contatti.csv"),
    `\uFEFF${contactsCsv}`,
    "utf8"
  );
  await writeFile(
    path.join(outDir, "lean-event-rubrica-sedi.csv"),
    `\uFEFF${venuesCsv}`,
    "utf8"
  );

  console.log("Modelli import Lean Event generati:");
  console.log(`  ${contactsPath}`);
  console.log(`  ${venuesPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
