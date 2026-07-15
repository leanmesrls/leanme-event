import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir =
  "C:/Users/siyaa/.cursor/projects/c-Cursor-leanme-site/assets";
const docsOut = path.join(root, "docs/assets/chi-siamo");
const publicOut = path.join(root, "public/assets/official/chi-siamo");

/** Copia fedele degli originali — nessun trim, crop o arrotondamento. */
const cards = [
  { match: "chi-siamo-1-", dest: "chi-siamo-01-azienda-ibrida.png" },
  { match: "chi-siamo-2-", dest: "chi-siamo-02-agente-ai.png" },
  { match: "chi-siamo-3-", dest: "chi-siamo-03-powered-by-ai.png" },
  { match: "chi-siamo-4a-", dest: "chi-siamo-04a-luana.png" },
  { match: "chi-siamo-4b-", dest: "chi-siamo-04b-ale.png" },
  { match: "chi-siamo-4c-", dest: "chi-siamo-04c-collaboratori-umani.png" },
  { match: "chi-siamo-4d-", dest: "chi-siamo-04d-collaboratori-agenti.png" },
  { match: "chi-siamo-5-", dest: "chi-siamo-05-perche-leanme.png" },
  { match: "chi-siamo-6-", dest: "chi-siamo-06-metodo.png" },
  { match: "chi-siamo-7-", dest: "chi-siamo-07-impegno.png" },
];

function resolveSource(match) {
  const file = fs.readdirSync(sourceDir).find((name) => name.includes(match));
  if (!file) throw new Error(`Source not found for ${match}`);
  return path.join(sourceDir, file);
}

async function copyOriginal({ match, dest }) {
  const src = resolveSource(match);
  const buffer = await sharp(fs.readFileSync(src))
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.mkdirSync(docsOut, { recursive: true });
  fs.mkdirSync(publicOut, { recursive: true });

  fs.writeFileSync(path.join(docsOut, dest), buffer);
  fs.writeFileSync(path.join(publicOut, dest), buffer);

  const meta = await sharp(buffer).metadata();
  console.log(`${dest} ← ${path.basename(src)} → ${meta.width}x${meta.height} (original)`);
}

for (const card of cards) {
  await copyOriginal(card);
}
