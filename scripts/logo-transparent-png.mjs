import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const logos = [
  {
    src: "docs/assets/logo-official_pink-white.svg",
    out: "logo-official_pink-white.png",
    blackThreshold: 62,
    bottomCropPct: 0,
  },
  {
    src: "docs/assets/logo-official_white.svg",
    out: "logo-official_white.png",
    blackThreshold: 40,
  },
  {
    src: "docs/assets/logo-official_black.svg",
    out: "logo-official_black.png",
    blackThreshold: 40,
  },
  {
    src: "docs/assets/logo-official.svg",
    out: "logo-official.png",
    blackThreshold: 40,
  },
];

function clearDarkBackground(pixels, channels, threshold) {
  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const max = Math.max(r, g, b);

    if (max <= threshold) {
      pixels[i + 3] = 0;
      continue;
    }

    if (max <= threshold + 30) {
      const fade = (max - threshold) / 30;
      pixels[i + 3] = Math.min(pixels[i + 3], Math.round(fade * 255));
    }
  }
}

async function removeNearBlackBackground(inputSvg, outputPng, options = {}) {
  const { blackThreshold = 40, bottomCropPct = 0 } = options;

  const { data, info } = await sharp(inputSvg, { density: 300 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixels = Buffer.from(data);
  clearDarkBackground(pixels, channels, blackThreshold);

  let buffer = await sharp(pixels, { raw: { width, height, channels } })
    .png()
    .toBuffer();

  buffer = await sharp(buffer).trim({ threshold: 0 }).toBuffer();

  if (bottomCropPct > 0) {
    const meta = await sharp(buffer).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    const bottomCut = Math.round(h * bottomCropPct);

    if (h > bottomCut + 24) {
      buffer = await sharp(buffer)
        .extract({ left: 0, top: 0, width: w, height: h - bottomCut })
        .toBuffer();
    }
  }

  buffer = await sharp(buffer).trim({ threshold: 0 }).toBuffer();

  await sharp(buffer)
    .resize({ width: 2200, withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPng);

  const meta = await sharp(outputPng).metadata();
  console.log(`${path.basename(outputPng)} → ${meta.width}x${meta.height} (alpha)`);
}

for (const logo of logos) {
  const input = path.join(root, logo.src);
  const output = path.join(root, "public/assets/official", logo.out);

  if (!fs.existsSync(input)) {
    console.warn("Skip", logo.src);
    continue;
  }

  await removeNearBlackBackground(input, output, logo);
}
