import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

import {
  removePublicSourceCopies,
  resolveVignetteSource,
} from "./lib/vignette-sync.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(root, "docs/assets/soluzioni-comunicazione");
const publicDir = path.join(
  root,
  "public/assets/official/soluzioni-comunicazione"
);

const mapping = Array.from({ length: 16 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    number,
    destName: `soluzioni-comunicazione-${number}.png`,
    sourceCandidates: [
      `${number}_soluzioni-comunicazione.png`,
      `soluzioni-comunicazione-${number}.png`,
    ],
  };
});

if (!fs.existsSync(docsDir)) {
  console.error("Missing source folder:", docsDir);
  console.error("Carica le vignette in docs/assets/soluzioni-comunicazione/");
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });

let synced = 0;

for (const item of mapping) {
  const src = resolveVignetteSource(docsDir, item.sourceCandidates);
  if (!src) {
    continue;
  }

  const buffer = await sharp(src).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, item.destName), buffer);
  removePublicSourceCopies(publicDir, [`${item.number}_soluzioni-comunicazione.png`]);

  const meta = await sharp(buffer).metadata();
  console.log(
    `${item.destName} ← ${path.basename(src)} → ${meta.width}x${meta.height}`
  );
  synced += 1;
}

if (synced === 0) {
  console.error("No vignettes found in docs/assets/soluzioni-comunicazione/");
  process.exit(1);
}

console.log(`Synced ${synced} vignette(s)`);
