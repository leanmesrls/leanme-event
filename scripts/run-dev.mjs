import { join } from "node:path";
import { spawn } from "node:child_process";

import {
  cleanNextDir,
  DEV_PORT,
  root,
  shouldCleanNextForDev,
} from "./dev-utils.mjs";

const nextDir = join(root, ".next");

if (shouldCleanNextForDev(nextDir)) {
  cleanNextDir(
    nextDir,
    "Cache .next incompatibile con dev: pulizia automatica."
  );
}

console.log(`[leanme] Avvio dev server su http://localhost:${DEV_PORT}`);

const devEnv = { ...process.env };
delete devEnv.LEAN_EVENT_PROD_BUILD;

const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(
  process.execPath,
  [nextCli, "dev", "--turbopack", "-p", String(DEV_PORT)],
  {
    cwd: root,
    stdio: "inherit",
    env: devEnv,
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
