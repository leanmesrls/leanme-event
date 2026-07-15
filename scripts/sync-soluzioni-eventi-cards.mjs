import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

import {
  removePublicSourceCopies,
  resolveVignetteSource,
} from "./lib/vignette-sync.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(root, "docs/assets/soluzioni-eventi");
const publicDir = path.join(root, "public/assets/official/soluzioni-eventi");

const mapping = Array.from({ length: 16 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    number,
    destName: `soluzioni-eventi-${number}.png`,
    sourceCandidates: [
      `${number}_soluzioni-eventi.png`,
      `soluzioni-eventi-${number}.png`,
    ],
  };
});

if (!fs.existsSync(docsDir)) {
  console.error("Missing source folder:", docsDir);
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });

for (const item of mapping) {
  const src = resolveVignetteSource(docsDir, item.sourceCandidates);

  if (!src) {
    console.error("Missing source for vignette", item.number);
    process.exit(1);
  }

  const buffer = await sharp(src).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(path.join(publicDir, item.destName), buffer);

  removePublicSourceCopies(publicDir, [`${item.number}_soluzioni-eventi.png`]);

  const meta = await sharp(buffer).metadata();
  console.log(
    `${item.destName} ← ${path.basename(src)} → ${meta.width}x${meta.height}`
  );
}

console.log("Source: docs/assets/soluzioni-eventi");
console.log("Output: public/assets/official/soluzioni-eventi");
