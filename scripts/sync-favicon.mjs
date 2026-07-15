import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "docs/assets/pittogramma.png");
const publicOut = path.join(root, "public/assets/official/pittogramma.png");
const appIcon = path.join(root, "app/icon.png");
const appAppleIcon = path.join(root, "app/apple-icon.png");

if (!fs.existsSync(src)) {
  console.error("Missing source:", src);
  process.exit(1);
}

async function squarePng(input, size, output) {
  await sharp(input)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    })
    .png({ compressionLevel: 9 })
    .toFile(output);

  const meta = await sharp(output).metadata();
  console.log(`${path.basename(output)} → ${meta.width}x${meta.height}`);
}

fs.mkdirSync(path.dirname(publicOut), { recursive: true });

await squarePng(src, 512, publicOut);
await squarePng(src, 512, appIcon);
await squarePng(src, 180, appAppleIcon);

console.log("Favicon synced");
