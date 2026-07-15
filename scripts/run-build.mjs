import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { DEV_PORT, killPort, root } from "./dev-utils.mjs";

if (process.env.VERCEL !== "1") {
  console.log(
    `[leanme] Verifica dev server sulla porta ${DEV_PORT} prima della build...`
  );
  killPort(DEV_PORT);
}

const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
const result = spawnSync(process.execPath, [nextCli, "build"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, LEAN_EVENT_PROD_BUILD: "1" },
});

if (result.status === 0) {
  console.log(
    `[leanme] Build completata. Riavvia il dev con: npm run dev (porta ${DEV_PORT}).`
  );
}

process.exit(result.status ?? 1);
