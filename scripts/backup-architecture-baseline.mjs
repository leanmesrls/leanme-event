/**
 * Baseline backup metadata for architecture cutover.
 * Does not print secrets. Writes table list + counts under a backup folder.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const outDir = process.argv[2];
if (!outDir) {
  console.error("Usage: node --env-file=.env.local scripts/backup-architecture-baseline.mjs <outDir>");
  process.exit(1);
}

const databaseUrl = process.env.LEAN_EVENT_DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("LEAN_EVENT_DATABASE_URL missing");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const sql = neon(databaseUrl);

const tables = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`;

const counts = {};
for (const row of tables) {
  const name = row.table_name;
  try {
    const result = await sql.query(`SELECT COUNT(*)::int AS c FROM "${name}"`);
    counts[name] = result[0]?.c ?? 0;
  } catch (error) {
    counts[name] = `ERR:${error instanceof Error ? error.message : String(error)}`;
  }
}

const payload = {
  at: new Date().toISOString(),
  tableCount: tables.length,
  tables: tables.map((t) => t.table_name),
  counts,
};

writeFileSync(join(outDir, "db-baseline.json"), JSON.stringify(payload, null, 2));
console.log(`DB_BACKUP_META_OK tables=${tables.length}`);
