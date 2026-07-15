import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(root, "docs/assets/homepage");
const publicDir = path.join(root, "public/assets/official/homepage");

const IMAGE_PATTERN = /\.(png|jpe?g|webp)$/i;

if (!fs.existsSync(docsDir)) {
  console.error("Missing source folder:", docsDir);
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });

const files = fs
  .readdirSync(docsDir)
  .filter((file) => IMAGE_PATTERN.test(file))
  .sort();

if (files.length === 0) {
  console.error("No images found in docs/assets/homepage/");
  process.exit(1);
}

for (const file of files) {
  const src = path.join(docsDir, file);
  const dest = path.join(publicDir, file);

  if (file.toLowerCase().endsWith(".png")) {
    const buffer = await sharp(src).png({ compressionLevel: 9 }).toBuffer();
    fs.writeFileSync(dest, buffer);
    const meta = await sharp(buffer).metadata();
    console.log(`${file} → ${meta.width}x${meta.height}`);
    continue;
  }

  fs.copyFileSync(src, dest);
  console.log(`${file} → copied`);
}

console.log(`Synced ${files.length} file(s) to public/assets/official/homepage/`);
