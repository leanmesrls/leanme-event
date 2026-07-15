import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const agents = [
  "leonardo",
  "vespucci",
  "marconi",
  "angela",
  "galileo",
  "olivetti",
  "teresa",
];

/** Migliora qualità percepita senza cambiare inquadratura: PNG lossless + sharpen leggero */
for (const agent of agents) {
  const jpg = path.join(root, "docs/assets", `${agent}-hp.jpg`);
  const png = path.join(root, "public/assets/official", `${agent}-hp.png`);
  const pngDocs = path.join(root, "docs/assets", `${agent}-hp.png`);

  if (!fs.existsSync(jpg)) {
    console.warn(`Skip ${agent}: ${jpg} not found`);
    continue;
  }

  const buffer = await sharp(jpg)
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 0.35, x1: 2, y2: 10, y3: 20 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  fs.writeFileSync(png, buffer);
  fs.writeFileSync(pngDocs, buffer);

  const meta = await sharp(buffer).metadata();
  console.log(
    `${agent}-hp.png → ${meta.width}x${meta.height} (${Math.round(buffer.length / 1024)} KB)`
  );
}
