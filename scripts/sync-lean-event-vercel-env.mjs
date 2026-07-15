#!/usr/bin/env node

import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

import { loadMinifiedTenantsJson } from "./lib/lean-event-tenants-json.mjs";

const root = process.cwd();
const ENV_NAME = "LEAN_EVENT_TENANTS_JSON";
const DEFAULT_ENVIRONMENTS = ["production", "preview"];

function runVercel(args, stdin) {
  const vercelBin = process.platform === "win32" ? "npx.cmd" : "npx";
  const vercelArgs = ["vercel", ...args];

  return new Promise((resolve, reject) => {
    const child = spawn(vercelBin, vercelArgs, {
      cwd: root,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `vercel exit ${code}`));
    });

    if (stdin !== undefined) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

async function vercelAvailable() {
  try {
    await runVercel(["--version"]);
    return true;
  } catch {
    return false;
  }
}

async function projectLinked() {
  try {
    await access(path.join(root, ".vercel", "project.json"));
    return true;
  } catch {
    return Boolean(process.env.VERCEL_PROJECT_ID && process.env.VERCEL_ORG_ID);
  }
}

async function removeEnv(environment) {
  try {
    await runVercel(["env", "rm", ENV_NAME, environment, "--yes"]);
  } catch {
    // Variable may not exist yet.
  }
}

async function addEnv(value, environment) {
  await runVercel(["env", "add", ENV_NAME, environment], value);
}

export async function syncLeanEventTenantsToVercel(options = {}) {
  const environments = options.environments ?? DEFAULT_ENVIRONMENTS;
  const deploy = options.deploy ?? false;
  const quiet = options.quiet ?? false;

  const json = await loadMinifiedTenantsJson(root);

  if (!(await vercelAvailable())) {
    throw new Error(
      "Vercel CLI non trovato. Installa con: npm i -g vercel"
    );
  }

  if (!(await projectLinked())) {
    throw new Error(
      "Progetto non collegato a Vercel. Esegui: vercel link"
    );
  }

  if (!quiet) {
    console.log("");
    console.log("=== Sync Lean Event → Vercel ===");
    console.log("");
  }

  for (const environment of environments) {
    if (!quiet) {
      console.log(`Aggiorno ${ENV_NAME} (${environment})...`);
    }
    await removeEnv(environment);
    await addEnv(json, environment);
  }

  if (!quiet) {
    console.log("");
    console.log("Variabile sincronizzata. Redeploy necessario per applicare.");
    console.log("");
    console.log("Variabili obbligatorie (impostare una sola volta su Vercel):");
    console.log("  LEAN_EVENT_SESSION_SECRET");
    console.log("  OPENAI_API_KEY");
    console.log("  NEXT_PUBLIC_SITE_URL=https://events.leanme.it");
    console.log("");
  }

  if (deploy) {
    if (!quiet) {
      console.log("Avvio deploy production...");
    }
    await runVercel(["deploy", "--prod"]);
    if (!quiet) {
      console.log("Deploy production completato.");
    }
  } else if (!quiet) {
    console.log("Deploy: vercel deploy --prod");
    console.log("Oppure: npm run lean-event:sync-vercel -- --deploy");
  }

  return { ok: true, environments };
}

async function main() {
  const deploy = process.argv.includes("--deploy");
  const productionOnly = process.argv.includes("--production-only");
  const environments = productionOnly
    ? ["production"]
    : DEFAULT_ENVIRONMENTS;

  try {
    await syncLeanEventTenantsToVercel({ deploy, environments });
  } catch (error) {
    console.error("");
    console.error("Sync Vercel non riuscito:", error.message);
    console.error("");
    console.error("Fallback manuale:");
    console.error("  npm run lean-event:vercel-env");
    console.error("  → incolla il JSON in Vercel → Environment Variables");
    console.error("  → Redeploy");
    console.error("");
    process.exit(1);
  }
}

const isDirectRun = process.argv[1]?.endsWith("sync-lean-event-vercel-env.mjs");
if (isDirectRun) {
  main();
}
