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

const CORNER_RADIUS = 10;
const SOURCE_DIRS = [
  path.join(root, "docs/assets/companies"),
  path.join(root, "docs/assets"),
];

function resolveSource(agent) {
  for (const dir of SOURCE_DIRS) {
    const standard = path.join(dir, `${agent}-hp.png`);
    if (fs.existsSync(standard)) return standard;
  }
  if (agent === "marconi") {
    const spaced = path.join(root, "docs/assets/companies", "marconi- hp.png");
    if (fs.existsSync(spaced)) return spaced;
  }
  return null;
}

async function roundCorners(buffer, radius) {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const r = Math.min(radius, Math.floor(Math.min(width, height) / 8));

  const mask = Buffer.from(
    `<svg width="${width}" height="${height}"><rect x="0" y="0" width="${width}" height="${height}" rx="${r}" ry="${r}" fill="#ffffff"/></svg>`,
  );

  return sharp(buffer)
    .composite([{ input: mask, blend: "dest-in" }])
    .flatten({ background: "#000000" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

for (const agent of agents) {
  const src = resolveSource(agent);

  if (!src) {
    console.warn(`Skip ${agent}: source PNG not found`);
    continue;
  }

  let buffer = await sharp(src).toBuffer();
  buffer = await roundCorners(buffer, CORNER_RADIUS);
  buffer = await sharp(buffer)
    .sharpen({ sigma: 0.8, m1: 0.5, m2: 0.35, x1: 2, y2: 10, y3: 20 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  const destDocs = path.join(root, "docs/assets", `${agent}-hp.png`);
  const destPublic = path.join(root, "public/assets/official", `${agent}-hp.png`);

  fs.writeFileSync(destDocs, buffer);
  fs.writeFileSync(destPublic, buffer);

  const meta = await sharp(buffer).metadata();
  console.log(
    `${agent}-hp.png ← ${path.relative(root, src)} → ${meta.width}x${meta.height} (r${CORNER_RADIUS})`,
  );
}
