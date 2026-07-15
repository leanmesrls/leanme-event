#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const root = process.cwd();
const dataDir = path.join(root, process.env.LEANYOU_DATA_DIR ?? ".leanyou-data");

const tenantsInput = [
  {
    id: "iec",
    name: "I&C srl",
    slug: "iec",
    profile: "client",
    capabilityPreset: "iec_pilot",
    modules: ["leonardo", "events", "government"],
    users: [
      {
        id: "iec-admin",
        email: "info@iec-srl.it",
        firstName: "Iec",
        lastName: "Srl",
        role: "admin",
        password: "iec-srl",
      },
    ],
  },
  {
    id: "demo",
    name: "Demo LeanYou",
    slug: "demo",
    profile: "showcase",
    modules: ["leonardo", "events", "government"],
    users: [
      {
        id: "demo-luana",
        email: "luana.martuzzi@leanme.it",
        firstName: "Luana",
        lastName: "Martuzzi",
        role: "admin",
        password: "leanme",
      },
    ],
  },
];

function token(prefix) {
  return `${prefix}_${randomBytes(24).toString("hex")}`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[;"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildExcelCsv(
  rows,
  columns
) {
  const lines = [
    columns.map((column) => column.label).join(";"),
    ...rows.map((row) =>
      columns.map((column) => csvEscape(row[column.key])).join(";")
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

async function main() {
  await mkdir(dataDir, { recursive: true });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const registryLines = [
    "# LeanYou — Registro accessi clienti",
    "",
    "> Documento generato automaticamente. Conservare in luogo sicuro.",
    "> Non committare su Git.",
    "",
    `Generato il: ${new Date().toISOString()}`,
    "",
  ];
  const excelRows = [];
  const credentialRows = [];

  const tenants = [];

  for (const tenant of tenantsInput) {
    const tenantToken = token(`tenant_${tenant.slug}`);
    registryLines.push(`## ${tenant.name}`, "");
    registryLines.push(`- **Tenant ID:** \`${tenant.id}\``);
    registryLines.push(`- **Token aziendale:** \`${tenantToken}\``);
    registryLines.push(
      `- **Accesso diretto azienda:** ${siteUrl}/leanyou/login?token=${tenantToken}`,
      ""
    );

    excelRows.push({
      company: tenant.name,
      firstName: "(token aziendale)",
      lastName: "",
      email: "",
      password: "",
      token: tenantToken,
      loginUrl: `${siteUrl}/leanyou/login?token=${tenantToken}`,
    });

    const users = [];
    for (const user of tenant.users) {
      const userToken = token(`user_${tenant.slug}`);
      const passwordHash = await bcrypt.hash(user.password, 12);
      const displayName = `${user.firstName} ${user.lastName}`.trim();

      users.push({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: displayName,
        role: user.role,
        passwordHash,
        accessToken: userToken,
      });

      registryLines.push(`### ${displayName}`);
      registryLines.push(`- **Email:** ${user.email}`);
      registryLines.push(`- **Password iniziale:** ${user.password}`);
      registryLines.push(`- **Token utente:** \`${userToken}\``);
      registryLines.push(
        `- **Accesso diretto utente:** ${siteUrl}/leanyou/login?token=${userToken}`,
        ""
      );

      excelRows.push({
        company: tenant.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: user.password,
        token: userToken,
        loginUrl: `${siteUrl}/leanyou/login?token=${userToken}`,
      });

      credentialRows.push({
        company: tenant.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: user.password,
        loginUrl: `${siteUrl}/leanyou/login?token=${userToken}`,
      });
    }

    tenants.push({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      profile: tenant.profile,
      capabilityPreset: tenant.capabilityPreset,
      accessToken: tenantToken,
      modules: tenant.modules,
      users,
    });
  }

  credentialRows.sort((a, b) =>
    `${a.company}-${a.lastName}-${a.firstName}`.localeCompare(
      `${b.company}-${b.lastName}-${b.firstName}`,
      "it"
    )
  );

  const tenantsFile = { tenants };
  const tenantsPath = path.join(dataDir, "tenants.json");
  const registryPath = path.join(dataDir, "access-registry.md");
  const excelPath = path.join(dataDir, "utenze-attive.csv");
  const credentialsPath = path.join(dataDir, "utenze-credenziali.csv");

  const fullColumns = [
    { key: "company", label: "Azienda" },
    { key: "firstName", label: "Nome" },
    { key: "lastName", label: "Cognome" },
    { key: "email", label: "Email" },
    { key: "password", label: "Password" },
    { key: "token", label: "Token" },
    { key: "loginUrl", label: "URL accesso diretto" },
  ];
  const credentialColumns = [
    { key: "company", label: "Azienda" },
    { key: "firstName", label: "Nome" },
    { key: "lastName", label: "Cognome" },
    { key: "email", label: "Email" },
    { key: "password", label: "Password" },
    { key: "loginUrl", label: "URL accesso diretto" },
  ];

  await writeFile(tenantsPath, JSON.stringify(tenantsFile, null, 2), "utf8");
  await writeFile(registryPath, registryLines.join("\n"), "utf8");
  await writeFile(excelPath, buildExcelCsv(excelRows, fullColumns), "utf8");
  await writeFile(
    credentialsPath,
    buildExcelCsv(credentialRows, credentialColumns),
    "utf8"
  );

  console.log(`Tenants scritti in: ${tenantsPath}`);
  console.log(`Registro accessi scritto in: ${registryPath}`);
  console.log(`Excel completo (con token): ${excelPath}`);
  console.log(`Excel credenziali (azienda/nome/cognome/email/pw/url): ${credentialsPath}`);
  console.log("");

  if (process.env.LEANYOU_SKIP_VERCEL_SYNC === "1") {
    console.log("Sync Vercel saltato (LEANYOU_SKIP_VERCEL_SYNC=1).");
    console.log("Manuale: npm run leanyou:sync-vercel");
    return;
  }

  try {
    const { syncLeanYouTenantsToVercel } = await import(
      "./sync-leanyou-vercel-env.mjs"
    );
    await syncLeanYouTenantsToVercel({ quiet: false });
  } catch (error) {
    console.warn("");
    console.warn("Sync Vercel automatico non eseguito:", error.message);
    console.warn("Fallback: npm run leanyou:vercel-env → incolla su Vercel");
    console.warn("Oppure: vercel link && npm run leanyou:sync-vercel");
    console.warn("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
