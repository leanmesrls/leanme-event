/**
 * Seed default document kind policies on a tenant DB.
 * Usage: node --env-file=.env.local scripts/seed-document-kind-policies.mjs demo
 */
import { neon } from "@neondatabase/serverless";

const tenantId = process.argv[2] || "demo";
const slug = tenantId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
const url =
  process.env[`LEAN_EVENT_TENANT_${slug}_DATABASE_URL`]?.trim() ||
  process.env.LEAN_EVENT_DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: DATABASE_URL missing");
  process.exit(2);
}

const policies = [
  { kind: "attestato_partecipazione", retention: "permanent", purge: false, audit: true, preview: true },
  { kind: "certificazione_ecm", retention: "permanent", purge: false, audit: true, preview: true },
  { kind: "agenas", retention: "permanent", purge: false, audit: true, preview: true },
  { kind: "cv", retention: "standard", purge: true, audit: false, preview: true },
  { kind: "faculty_pack", retention: "standard", purge: true, audit: false, preview: true },
  { kind: "travel_id", retention: "privacy_short", purge: true, audit: true, preview: false, days: 90 },
  { kind: "supplier_agreement", retention: "contractual", purge: true, audit: true, preview: true },
  { kind: "other", retention: "standard", purge: true, audit: false, preview: true },
];

const sql = neon(url);
for (const p of policies) {
  await sql`
    INSERT INTO lean_event_document_kind_policies (
      tenant_id, kind, retention_class, soft_delete_days, allow_auto_purge,
      require_download_audit, allow_preview, created_at, updated_at
    ) VALUES (
      ${tenantId}, ${p.kind}, ${p.retention}, ${p.days ?? null}, ${p.purge},
      ${p.audit}, ${p.preview}, now(), now()
    )
    ON CONFLICT (tenant_id, kind) DO UPDATE SET
      retention_class = EXCLUDED.retention_class,
      soft_delete_days = EXCLUDED.soft_delete_days,
      allow_auto_purge = EXCLUDED.allow_auto_purge,
      require_download_audit = EXCLUDED.require_download_audit,
      allow_preview = EXCLUDED.allow_preview,
      updated_at = now()
  `;
}
console.log(`SEEDED_POLICIES=${policies.length} TENANT=${tenantId}`);
