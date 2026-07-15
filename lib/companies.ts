import fs from "fs";
import path from "path";

const PUBLIC_COMPANIES_DIR = path.join(process.cwd(), "public", "assets", "companies");

function slugify(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface PartnerLogo {
  name: string;
  logo: string;
  alt: string;
}

function mapFiles(files: string[], baseDir: string, urlPrefix: string): PartnerLogo[] {
  return files.sort((a, b) => a.localeCompare(b, "it")).map((file) => {
    const slug = slugify(file);
    const publicName = `${slug}${path.extname(file).toLowerCase()}`;
    const name = file.replace(/\.[^.]+$/, "");

    return {
      name,
      logo: `${urlPrefix}/${publicName}`,
      alt: name,
    };
  });
}

/** Elenco di tutti i loghi ufficiali — legge da public/assets/companies */
export function getPartnerLogos(): PartnerLogo[] {
  if (!fs.existsSync(PUBLIC_COMPANIES_DIR)) return [];

  const files = fs.readdirSync(PUBLIC_COMPANIES_DIR).filter((file) =>
    /\.(png|jpe?g|webp|svg)$/i.test(file)
  );

  return mapFiles(files, PUBLIC_COMPANIES_DIR, "/assets/companies");
}
