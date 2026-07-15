#!/usr/bin/env node

import { loadMinifiedTenantsJson } from "./lib/leanyou-tenants-json.mjs";

async function main() {
  const minified = await loadMinifiedTenantsJson();

  console.log("");
  console.log("=== Vercel → Settings → Environment Variables ===");
  console.log("");
  console.log("Name: LEANYOU_TENANTS_JSON");
  console.log("Value (incolla tutta la riga sotto):");
  console.log("");
  console.log(minified);
  console.log("");
  console.log("Ambiente consigliato: Production (+ Preview se serve demo)");
  console.log("");
  console.log("Sync automatico: npm run leanyou:sync-vercel");
  console.log("Sync + redeploy: npm run leanyou:sync-vercel -- --deploy");
  console.log("");
}

main().catch((error) => {
  console.error(
    "Errore: esegui prima `npm run leanyou:access` per generare tenants.json"
  );
  console.error(error.message);
  process.exit(1);
});
