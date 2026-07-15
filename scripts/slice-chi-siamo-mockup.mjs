import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "docs/assets/companies/UI_chi-siamo_APPROVED_v1.png");
const outDir = path.join(root, "public/assets/official/chi-siamo");
const docsOut = path.join(root, "docs/assets/chi-siamo");

/** Crop regions on 2176×3264 mockup — sezioni fumetto (esclusi hero e footer rosa) */
const slices = [
  { name: "01-azienda-ibrida", left: 0, top: 372, width: 2176, height: 348 },
  { name: "02-agente-ai", left: 0, top: 728, width: 2176, height: 420 },
  { name: "04-team", left: 0, top: 1158, width: 2176, height: 668 },
  { name: "05-perche-leanme", left: 0, top: 1834, width: 2176, height: 318 },
  { name: "06-metodo", left: 0, top: 2160, width: 2176, height: 348 },
  { name: "07-impegno", left: 0, top: 2516, width: 2176, height: 420 },
  { name: "04-luana", left: 48, top: 1288, width: 500, height: 520 },
  { name: "04-ale", left: 568, top: 1288, width: 500, height: 520 },
  { name: "04-collaboratori-umani", left: 1088, top: 1288, width: 500, height: 520 },
  { name: "04-collaboratori-agenti", left: 1608, top: 1288, width: 520, height: 520 },
];

if (!fs.existsSync(source)) {
  console.error("Mockup not found:", source);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(docsOut, { recursive: true });

for (const slice of slices) {
  const buffer = await sharp(source)
    .extract({
      left: slice.left,
      top: slice.top,
      width: slice.width,
      height: slice.height,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const filename = `${slice.name}.png`;
  fs.writeFileSync(path.join(outDir, filename), buffer);
  fs.writeFileSync(path.join(docsOut, filename), buffer);
  console.log(filename);
}
