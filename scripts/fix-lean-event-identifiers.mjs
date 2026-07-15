#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const skip = new Set(["node_modules", ".next", ".next-prod", ".git"]);

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!skip.has(entry.name)) {
        await walk(path.join(dir, entry.name), files);
      }
    } else {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

const UI_RESTORE = [
  ["LeanEvent ·", "Lean Event ·"],
  ['title: "LeanEvent', 'title: "Lean Event'],
  [">LeanEvent<", ">Lean Event<"],
  ['"LeanEvent"', '"Lean Event"'],
  ["LeanEvent%20", "Lean Event%20"],
  ["# LeanEvent", "# Lean Event"],
  ["**LeanEvent**", "**Lean Event**"],
  ["LeanEvent —", "Lean Event —"],
  ["LeanEvent (", "Lean Event ("],
  ["Modelli import LeanEvent", "Modelli import Lean Event"],
  ["workspace LeanEvent", "workspace Lean Event"],
  ["area LeanEvent", "area Lean Event"],
  ["Sync LeanEvent", "Sync Lean Event"],
  ["import LeanEvent", "import Lean Event"],
  ["LeanEvent v1", "Lean Event v1"],
  ["LeanEvent/", "Lean Event/"],
];

async function main() {
  const files = await walk(root);
  let count = 0;

  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    if (!/\.(ts|tsx|mjs)$/.test(rel)) continue;
    if (rel.includes("rename-leanyou") || rel.includes("fix-lean-event-identifiers")) {
      continue;
    }

    const raw = await readFile(file, "utf8");
    if (!raw.includes("Lean Event")) continue;

    let next = raw.split("Lean Event").join("LeanEvent");
    for (const [from, to] of UI_RESTORE) {
      next = next.split(from).join(to);
    }

    await writeFile(file, next, "utf8");
    count += 1;
    console.log("fixed:", rel);
  }

  console.log(`\nFixed ${count} file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
