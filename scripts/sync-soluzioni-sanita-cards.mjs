import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(root, "docs/assets/soluzioni-sanita");
const publicDir = path.join(root, "public/assets/official/soluzioni-sanita");

const mapping = Array.from({ length: 10 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return [
    `${number}_soluzioni_sanita.png`,
    `soluzioni-sanita-${number}.png`,
  ];
});

fs.mkdirSync(publicDir, { recursive: true });

for (const [srcName, destName] of mapping) {
  const src = path.join(docsDir, srcName);
  if (!fs.existsSync(src)) {
    console.error("Missing:", srcName);
    process.exit(1);
  }

  const buffer = await sharp(src).png({ compressionLevel: 9 }).toBuffer();

  fs.writeFileSync(path.join(publicDir, destName), buffer);

  const meta = await sharp(buffer).metadata();
  console.log(`${destName} ← ${srcName} → ${meta.width}x${meta.height}`);
}
