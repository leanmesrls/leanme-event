/**
 * Carica file env stile Vercel (.env.vercel.pull) in process.env.
 * Gestisce virgolette su una riga (formato tipico `vercel env pull`).
 */
import fs from "node:fs";

export function loadEnvFileIntoProcess(filePath, { override = true } = {}) {
  if (!fs.existsSync(filePath)) {
    return { ok: false, reason: "missing", loaded: 0, keys: [], emptySensitive: [] };
  }

  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  let loaded = 0;
  const keys = [];
  const emptySensitive = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1);

    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value
        .slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    } else if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
      value = value.slice(1, -1);
    } else {
      value = value.trim();
    }

    if (!key) continue;
    if (!override && process.env[key]) continue;

    if (value !== "") {
      process.env[key] = value;
      loaded += 1;
      keys.push(key);
    } else if (
      /TOKEN|SECRET|DATABASE|TENANTS|PASSWORD|BLOB/i.test(key)
    ) {
      emptySensitive.push(key);
    }
  }

  return { ok: true, loaded, keys, emptySensitive };
}
