import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMPANIES_DIR = path.join(root, "docs", "assets", "companies");
const PUBLIC_COMPANIES_DIR = path.join(root, "public", "assets", "companies");

function slugify(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

if (!fs.existsSync(COMPANIES_DIR)) {
  console.warn("Partner source folder not found:", COMPANIES_DIR);
  process.exit(0);
}

fs.mkdirSync(PUBLIC_COMPANIES_DIR, { recursive: true });

const files = fs
  .readdirSync(COMPANIES_DIR)
  .filter((file) => /\.(png|jpe?g|webp|svg)$/i.test(file));

let copied = 0;

for (const file of files) {
  const slug = slugify(file);
  const destName = `${slug}${path.extname(file).toLowerCase()}`;
  const dest = path.join(PUBLIC_COMPANIES_DIR, destName);
  const src = path.join(COMPANIES_DIR, file);

  try {
    if (!fs.existsSync(dest) || fs.statSync(src).mtimeMs > fs.statSync(dest).mtimeMs) {
      fs.copyFileSync(src, dest);
      copied += 1;
    }
  } catch (error) {
    console.warn(`Skipped ${file}:`, error.message);
  }
}

console.log(`Partner logos synced (${copied} updated, ${files.length} total).`);
