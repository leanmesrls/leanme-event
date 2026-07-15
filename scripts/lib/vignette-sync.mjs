import fs from "fs";
import path from "path";

export function resolveVignetteSource(
  docsDir,
  candidates,
  { preferNewest = true } = {}
) {
  const existing = candidates
    .map((name) => path.join(docsDir, name))
    .filter((filePath) => fs.existsSync(filePath));

  if (existing.length === 0) {
    return null;
  }

  if (!preferNewest || existing.length === 1) {
    return existing[0];
  }

  return existing.sort(
    (left, right) =>
      fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs
  )[0];
}

export function removePublicSourceCopies(publicDir, sourceNames) {
  for (const name of sourceNames) {
    const filePath = path.join(publicDir, name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
