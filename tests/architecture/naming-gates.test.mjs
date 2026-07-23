import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { describe, it } from "node:test";

function rg(pattern, globs = []) {
  const globArgs = globs.flatMap((g) => ["--glob", g]);
  try {
    return execSync(
      `rg -n -i ${JSON.stringify(pattern)} ${globArgs.map((a) => JSON.stringify(a)).join(" ")} --glob "!node_modules/**" --glob "!.next/**" --glob "!.lean-event-data/**" --glob "!docs/**" --glob "!docs-site/**" --glob "!tests/**" --glob "!scripts/rename-*.mjs" --glob "!scripts/bootstrap-*.mjs" --glob "!scripts/codemod-*.mjs" .`,
      { encoding: "utf8", shell: true }
    );
  } catch (error) {
    const err = error;
    if (err.status === 1) return "";
    throw error;
  }
}

describe("architecture naming gates", () => {
  it("forbids direct OpenAI calls outside provider", () => {
    const out = rg("api\\.openai\\.com", [
      "!modules/ai/providers/**",
      "!tests/**",
    ]);
    assert.equal(out.trim(), "", `Unexpected OpenAI calls:\n${out}`);
  });

  it("forbids technical agent folder routes like /ai/leonardo", () => {
    const out = rg("/ai/leonardo");
    assert.equal(out.trim(), "", `Commercial agent route found:\n${out}`);
  });
});
