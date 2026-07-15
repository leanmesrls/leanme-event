#!/usr/bin/env node

/**
 * Verifica rapida ambiente FFmpeg lato browser (cross-origin isolation + asset).
 * Uso: node scripts/verify-ffmpeg-env.mjs [baseUrl]
 */

const baseUrl = process.argv[2] ?? "https://demo.leanme.it";

async function check(url, label) {
  const response = await fetch(url, { method: "HEAD" });
  const headers = {
    coop: response.headers.get("cross-origin-opener-policy"),
    coep: response.headers.get("cross-origin-embedder-policy"),
    corp: response.headers.get("cross-origin-resource-policy"),
    type: response.headers.get("content-type"),
  };

  console.log(`${label}: ${response.status}`);
  console.log(`  COOP=${headers.coop ?? "-"} COEP=${headers.coep ?? "-"} CORP=${headers.corp ?? "-"}`);
  if (headers.type) {
    console.log(`  Content-Type=${headers.type}`);
  }

  return response.ok;
}

async function main() {
  console.log(`Base URL: ${baseUrl}\n`);

  const okPage = await check(`${baseUrl}/lean-event/login`, "LeanEvent login page");
  const okJs = await check(`${baseUrl}/ffmpeg/ffmpeg-core.js`, "FFmpeg core JS");
  const okWasm = await check(`${baseUrl}/ffmpeg/ffmpeg-core.wasm`, "FFmpeg core WASM");

  if (!okPage || !okJs || !okWasm) {
    process.exit(1);
  }

  console.log("\nAsset check OK. Per il worker FFmpeg servono anche header COEP su /_next/static/chunks/* (deploy >= fix corrente).");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
