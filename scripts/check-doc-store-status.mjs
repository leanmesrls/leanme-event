import { neon } from "@neondatabase/serverless";

async function check(label, url) {
  if (!url) {
    console.log(`${label}: NO_URL`);
    return;
  }
  const sql = neon(url);
  const meta = await sql`SELECT key, value FROM lean_event_schema_meta ORDER BY key`;
  const t = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM lean_event_documents) AS docs,
      (SELECT COUNT(*)::int FROM lean_event_document_versions) AS versions,
      (SELECT COUNT(*)::int FROM lean_event_document_chunks) AS chunks,
      (SELECT COUNT(*)::int FROM lean_event_blob_migration_ledger) AS ledger,
      (SELECT COUNT(*)::int FROM lean_event_document_kind_policies) AS policies
  `;
  const schemaBits = meta
    .filter((r) => /008|schema|document/i.test(`${r.key} ${r.value}`))
    .map((r) => `${r.key}=${r.value}`)
    .join(" ");
  console.log(
    `${label} ${schemaBits || "meta_keys=" + meta.map((r) => r.key).join(",")} docs=${t[0].docs} versions=${t[0].versions} chunks=${t[0].chunks} ledger=${t[0].ledger} policies=${t[0].policies}`
  );
}

await check("demo", process.env.LEAN_EVENT_TENANT_DEMO_DATABASE_URL);
await check("iec", process.env.LEAN_EVENT_TENANT_IEC_DATABASE_URL);
await check("neondb", process.env.LEAN_EVENT_DATABASE_URL);
