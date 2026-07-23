/**
 * R03 gate — no @vercel/blob in application request path (app/lib/core/modules/…).
 * Scripts under scripts/ remain allowed until store/token decommission.
 * LEAN_EVENT_R03_STRICT=1 also forbids scripts (final decommission mode).
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { describe, it } from "node:test";

function listBlobImports(roots) {
  let out = "";
  try {
    out = execSync(
      `rg -n --no-heading "from [\\"']@vercel/blob[\\"']|require\\([\\"']@vercel/blob[\\"']\\)" -g "*.ts" -g "*.tsx" -g "*.mjs" -g "!node_modules/**" -g "!.next/**" -g "!tests/**" -g "!docs/**" -g "!tmp/**" ${roots}`,
      { encoding: "utf8", shell: true }
    );
  } catch (error) {
    if (error.status === 1) return [];
    throw error;
  }
  const files = new Set();
  for (const line of out.split(/\r?\n/).filter(Boolean)) {
    const file = line
      .split(":")[0]
      ?.replace(/^\.\//, "")
      .replace(/\\/g, "/");
    if (file) files.add(file);
  }
  return [...files].sort();
}

describe("R03 @vercel/blob application gate", () => {
  it("forbids @vercel/blob in application runtime paths", () => {
    const files = listBlobImports("app lib core modules contracts platform");
    assert.deepEqual(
      files,
      [],
      `Unexpected @vercel/blob imports in runtime:\n${files.join("\n")}`
    );
  });

  it("scripts may keep Blob only until strict decommission", () => {
    const strict = process.env.LEAN_EVENT_R03_STRICT === "1";
    const files = listBlobImports("scripts");
    if (strict) {
      assert.deepEqual(
        files,
        [],
        `R03 strict: unexpected script Blob imports:\n${files.join("\n")}`
      );
      return;
    }
    // Non-strict: scripts are allowed; just assert scan works
    assert.ok(Array.isArray(files));
  });
});
