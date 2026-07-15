import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "docs/assets/logo-official_pink-white.svg",
  "docs/assets/logo-official_white.svg",
  "docs/assets/logo-official_black.svg",
  "docs/assets/logo-official.svg",
];

// Ritaglio viewBox: lupo + wordmark, margine basso rimosso (evita rettangolo nero)
const CROPPED_VIEWBOX = "15 208 1095 365";

for (const rel of files) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) continue;

  let svg = fs.readFileSync(filePath, "utf8");
  svg = svg.replace(/viewBox="[^"]+"/, `viewBox="${CROPPED_VIEWBOX}"`);
  fs.writeFileSync(filePath, svg);

  const publicName = path.basename(rel);
  const publicPath = path.join(root, "public/assets/official", publicName);
  fs.writeFileSync(publicPath, svg);
  console.log("Updated", rel);
}
