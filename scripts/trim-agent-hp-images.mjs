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

const FALLBACK_SOURCES = {
  marconi: "marconi- hp.jpg",
};

const TRIM_THRESHOLD = 45;
const INSET_PX = 8;
const CORNER_RADIUS = 10;

function resolveSource(agent) {
  const hp = path.join(root, "docs/assets", `${agent}-hp.jpg`);
  const fallback = FALLBACK_SOURCES[agent];
  if (fs.existsSync(hp)) return hp;
  if (fallback) {
    const alt = path.join(root, "docs/assets", fallback);
    if (fs.existsSync(alt)) return alt;
  }
  return hp;
}

async function cropInset(buffer, inset) {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const safeInset = Math.min(
    inset,
    Math.floor(Math.min(width, height) * 0.04)
  );

  if (width <= safeInset * 2 + 20 || height <= safeInset * 2 + 20) {
    return buffer;
  }

  return sharp(buffer)
    .extract({
      left: safeInset,
      top: safeInset,
      width: width - safeInset * 2,
      height: height - safeInset * 2,
    })
    .toBuffer();
}

async function roundCorners(buffer, radius) {
  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const r = Math.min(radius, Math.floor(Math.min(width, height) / 8));

  const mask = Buffer.from(
    `<svg width="${width}" height="${height}"><rect x="0" y="0" width="${width}" height="${height}" rx="${r}" ry="${r}" fill="#ffffff"/></svg>`
  );

  return sharp(buffer)
    .composite([{ input: mask, blend: "dest-in" }])
    .flatten({ background: "#000000" })
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer();
}

for (const agent of agents) {
  const src = resolveSource(agent);

  if (!fs.existsSync(src)) {
    console.warn(`Skip ${agent}: ${src} not found`);
    continue;
  }

  let buffer = await sharp(src)
    .trim({ threshold: TRIM_THRESHOLD, background: { r: 255, g: 255, b: 255 } })
    .toBuffer();

  buffer = await cropInset(buffer, INSET_PX);

  buffer = await sharp(buffer)
    .trim({ threshold: TRIM_THRESHOLD, background: { r: 255, g: 255, b: 255 } })
    .toBuffer();

  buffer = await cropInset(buffer, 3);

  buffer = await roundCorners(buffer, CORNER_RADIUS);

  const meta = await sharp(buffer).metadata();
  const destDocs = path.join(root, "docs/assets", `${agent}-hp.jpg`);
  const destPublic = path.join(root, "public/assets/official", `${agent}-hp.jpg`);

  fs.writeFileSync(destDocs, buffer);
  fs.writeFileSync(destPublic, buffer);

  console.log(`${agent}-hp.jpg → ${meta.width}x${meta.height} (trim + inset + r${CORNER_RADIUS})`);
}
