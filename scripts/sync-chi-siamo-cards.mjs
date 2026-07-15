import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(root, "docs/assets/chi-siamo");
const publicDir = path.join(root, "public/assets/official/chi-siamo");

const mapping = [
  ["01-chi siamo.png", "chi-siamo-01-azienda-ibrida.png"],
  ["02-chi siamo.png", "chi-siamo-02-agente-ai.png"],
  ["03-chi siamo.png", "chi-siamo-03-powered-by-ai.png"],
  ["04a-chi siamo.png", "chi-siamo-04a-luana.png"],
  ["04b-chi siamo.png", "chi-siamo-04b-ale.png"],
  ["04c-chi siamo.png", "chi-siamo-04c-collaboratori-umani.png"],
  ["04d-chi siamo.png", "chi-siamo-04d-collaboratori-agenti.png"],
  ["05-chi siamo.png", "chi-siamo-05-perche-leanme.png"],
  ["06-chi siamo.png", "chi-siamo-06-metodo.png"],
  ["07-chi siamo.png", "chi-siamo-07-impegno.png"],
];

fs.mkdirSync(publicDir, { recursive: true });

for (const [srcName, destName] of mapping) {
  const src = path.join(docsDir, srcName);
  if (!fs.existsSync(src)) {
    console.error("Missing:", srcName);
    process.exit(1);
  }

  const buffer = await sharp(src)
    .png({ compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(docsDir, destName), buffer);
  fs.writeFileSync(path.join(publicDir, destName), buffer);

  const meta = await sharp(buffer).metadata();
  console.log(`${destName} ← ${srcName} → ${meta.width}x${meta.height}`);
}
