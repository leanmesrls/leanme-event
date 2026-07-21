/**
 * Imposta su Vercel Production i flag cutover N2–N4.
 * Usage: npm.cmd run lean-event:sync-vercel-normalized
 *
 * N4: LEGACY_ENTITY_MIRROR=0 (stop dual-write JSONB).
 * Non stampa secret. Richiede `vercel` CLI linkato al progetto.
 */
import { spawnSync } from "node:child_process";

const flags = {
  LEAN_EVENT_NORMALIZED_SOT: "1",
  LEAN_EVENT_READ_NORMALIZED: "1",
  LEAN_EVENT_LEGACY_ENTITY_MIRROR: "0",
};

function setEnv(name, value) {
  // rimuovi se esiste (ignore error), poi add
  spawnSync("npx", ["vercel", "env", "rm", name, "production", "-y"], {
    stdio: "ignore",
    shell: true,
  });
  const result = spawnSync(
    "npx",
    ["vercel", "env", "add", name, "production"],
    {
      input: `${value}\n`,
      encoding: "utf8",
      shell: true,
    }
  );
  if (result.status !== 0) {
    console.error(`FAIL set ${name}`);
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
  console.log(`OK ${name}=${value} (production)`);
}

console.log("Sync flag normalizzati su Vercel production...");
for (const [name, value] of Object.entries(flags)) {
  setEnv(name, value);
}
console.log(
  "Fatto. Redeploy: npx vercel deploy --prod --yes (o git push)."
);
