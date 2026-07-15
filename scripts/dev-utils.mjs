import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export const DEV_PORT = 3012;

export function killPort(port) {
  if (process.platform === "win32") {
    try {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"],
      });
      const pids = new Set();
      for (const line of output.split("\n")) {
        if (!line.includes("LISTENING")) {
          continue;
        }
        const pid = line.trim().split(/\s+/).at(-1);
        if (pid && pid !== "0") {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      }
      if (pids.size > 0) {
        console.log(`[leanme] Processo sulla porta ${port} terminato (PID ${[...pids].join(", ")}).`);
      }
    } catch {
      // Nessun processo in ascolto sulla porta.
    }
    return;
  }

  try {
    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: "ignore", shell: true });
    console.log(`[leanme] Processo sulla porta ${port} terminato.`);
  } catch {
    // Nessun processo in ascolto sulla porta.
  }
}

export function shouldCleanNextForDev(nextDir) {
  if (!existsSync(nextDir)) {
    return false;
  }

  // `next build` e `next dev` condividono `.next`: la build lascia BUILD_ID.
  if (existsSync(path.join(nextDir, "BUILD_ID"))) {
    return true;
  }

  // Cache ibrida/corrotta (build interrotta o dev + build contemporanei).
  const hasProductionRoutes = existsSync(path.join(nextDir, "routes-manifest.json"));
  const hasDevAppManifest = existsSync(
    path.join(nextDir, "server", "app", "page", "app-build-manifest.json")
  );
  const hasServerDir = existsSync(path.join(nextDir, "server"));

  return hasProductionRoutes && hasServerDir && !hasDevAppManifest;
}

export function cleanNextDir(nextDir, reason) {
  if (!existsSync(nextDir)) {
    return;
  }

  console.log(`[leanme] ${reason}`);
  rmSync(nextDir, { recursive: true, force: true });
}
