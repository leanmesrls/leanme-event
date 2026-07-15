import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "docs/assets/chi-siamo");
const publicDir = path.join(root, "public/assets/official/chi-siamo");

/** Ritaglio interno al bordo nero — angoli squadrati. */
const crops = [
  { file: "chi-siamo-05-perche-leanme.png", left: 14, top: 14, right: 14, bottom: 14 },
  { file: "chi-siamo-06-metodo.png", left: 14, top: 14, right: 14, bottom: 14 },
  { file: "chi-siamo-07-impegno.png", left: 12, top: 11, right: 12, bottom: 11 },
];

async function detectBorderInset(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const isDark = (x, y) => {
    const i = (y * width + x) * channels;
    return data[i] < 40 && data[i + 1] < 40 && data[i + 2] < 40;
  };

  let top = 0;
  for (let y = 0; y < height; y++) {
    let dark = 0;
    for (let x = 0; x < width; x++) if (isDark(x, y)) dark++;
    if (dark < width * 0.55) {
      top = y;
      break;
    }
  }

  let bottom = height - 1;
  for (let y = height - 1; y >= 0; y--) {
    let dark = 0;
    for (let x = 0; x < width; x++) if (isDark(x, y)) dark++;
    if (dark < width * 0.55) {
      bottom = y;
      break;
    }
  }

  let left = 0;
  for (let x = 0; x < width; x++) {
    let dark = 0;
    for (let y = 0; y < height; y++) if (isDark(x, y)) dark++;
    if (dark < height * 0.55) {
      left = x;
      break;
    }
  }

  let right = width - 1;
  for (let x = width - 1; x >= 0; x--) {
    let dark = 0;
    for (let y = 0; y < height; y++) if (isDark(x, y)) dark++;
    if (dark < height * 0.55) {
      right = x;
      break;
    }
  }

  return {
    left: left + 2,
    top: top + 2,
    width: right - left - 3,
    height: bottom - top - 3,
  };
}

async function cropPanel({ file, left, top, right, bottom }, useDetect) {
  const src = path.join(dir, file);
  const meta = await sharp(src).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const extract = useDetect
    ? await detectBorderInset(src)
    : {
        left,
        top,
        width: width - left - right,
        height: height - top - bottom,
      };

  const buffer = await sharp(src).extract(extract).png({ compressionLevel: 9 }).toBuffer();

  fs.writeFileSync(src, buffer);
  fs.writeFileSync(path.join(publicDir, file), buffer);

  const out = await sharp(buffer).metadata();
  console.log(
    `${file}: ${width}x${height} → ${out.width}x${out.height}`,
  );
  return { width: out.width ?? 0, height: out.height ?? 0 };
}

const useDetect = process.argv.includes("--detect");
const dims = {};
for (const crop of crops) {
  const key = crop.file.match(/(\d{2})/)?.[1] ?? crop.file;
  dims[key] = await cropPanel(crop, useDetect);
}

console.log("Dimensions:", dims);
