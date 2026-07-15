#!/usr/bin/env node

import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const version = "0.12.6";
const sourceDir = path.join(root, "node_modules", "@ffmpeg", "core", "dist", "umd");
const targetDir = path.join(root, "public", "ffmpeg");

const files = ["ffmpeg-core.js", "ffmpeg-core.wasm"];

async function main() {
  await mkdir(targetDir, { recursive: true });

  for (const file of files) {
    await copyFile(path.join(sourceDir, file), path.join(targetDir, file));
  }

  console.log(`FFmpeg core ${version} copiato in public/ffmpeg/`);
}

main().catch((error) => {
  console.error("Errore copia FFmpeg core:", error.message);
  process.exit(1);
});
