import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(root, "docs/assets/agenti-schede");
const publicDir = path.join(root, "public/assets/official/agenti-schede");

const AGENT_SLUGS = [
  "leonardo",
  "vespucci",
  "marconi",
  "angela",
  "galileo",
  "olivetti",
  "teresa",
];

const IMAGE_PATTERN = /\.(png|jpe?g|webp)$/i;

if (!fs.existsSync(docsDir)) {
  console.error("Missing source folder:", docsDir);
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });

function resolveSource(slug, suffix) {
  const candidates = [
    `${slug}${suffix}.png`,
    `${slug}${suffix}.jpg`,
    `${slug}${suffix}.jpeg`,
    `${slug}${suffix}.webp`,
    `${slug}-${suffix}.png`,
    `${slug}-${suffix}.jpg`,
  ].map((name) => path.join(docsDir, name));

  return candidates.find((filePath) => fs.existsSync(filePath)) ?? null;
}

async function syncFile(src, destName) {
  const dest = path.join(publicDir, destName);
  const buffer = await sharp(src).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(dest, buffer);
  const meta = await sharp(buffer).metadata();
  console.log(`${destName} ← ${path.basename(src)} → ${meta.width}x${meta.height}`);
}

let synced = 0;

for (const slug of AGENT_SLUGS) {
  const scheda =
    resolveSource(slug, "-scheda") ??
    resolveSource(slug, "_scheda") ??
    resolveSource(slug, "-scheda-tecnica");
  const source = scheda ?? resolveSource(slug, "");

  if (!source) {
    console.warn(`Skip ${slug}: no source image`);
    continue;
  }

  await syncFile(source, `${slug}.png`);
  synced += 1;
}

const looseFiles = fs
  .readdirSync(docsDir)
  .filter((file) => IMAGE_PATTERN.test(file));

for (const file of looseFiles) {
  const normalized = file.toLowerCase().replace(/\s+/g, "-");
  const slugMatch = AGENT_SLUGS.find((slug) => normalized.startsWith(`${slug}.`));

  if (slugMatch) {
    continue;
  }

  const dest = path.join(publicDir, normalized);
  if (fs.existsSync(dest)) {
    continue;
  }

  await syncFile(path.join(docsDir, file), normalized);
  synced += 1;
}

if (synced === 0) {
  console.error("No agent images found in docs/assets/agenti-schede/");
  console.error("Expected names like leonardo.png or leonardo-scheda.png");
  process.exit(1);
}

console.log(`Synced ${synced} file(s) to public/assets/official/agenti-schede/`);
