/**
 * Smoke N3: lettura tabelle tipizzate (senza login HTTP).
 * Usage: npm.cmd run lean-event:smoke-normalized
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.LEAN_EVENT_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("FAIL: manca LEAN_EVENT_DATABASE_URL");
  process.exit(1);
}

const sql = neon(url);

const flags = {
  NORMALIZED_SOT: process.env.LEAN_EVENT_NORMALIZED_SOT,
  READ_NORMALIZED: process.env.LEAN_EVENT_READ_NORMALIZED,
  LEGACY_MIRROR: process.env.LEAN_EVENT_LEGACY_ENTITY_MIRROR,
  READ_FROM_NEON: process.env.LEAN_EVENT_READ_FROM_NEON,
};
console.log("flags:", flags);

const tenants = await sql`
  SELECT tenant_id, COUNT(*)::int AS n
  FROM lean_event_events
  GROUP BY tenant_id
  ORDER BY n DESC
  LIMIT 5
`;
console.log("tenants with events:", tenants);

const tenantId = tenants[0]?.tenant_id;
if (!tenantId) {
  console.error("FAIL: nessun evento in lean_event_events");
  process.exit(2);
}

const checks = [];

async function check(name, fn) {
  try {
    const n = await fn();
    checks.push({ name, ok: true, n });
    console.log(`OK ${name}: ${n}`);
  } catch (error) {
    checks.push({ name, ok: false, error: String(error?.message || error) });
    console.error(`FAIL ${name}:`, error?.message || error);
  }
}

await check("events", async () => {
  const rows = await sql`
    SELECT id, title, is_favorite, revision
    FROM lean_event_events
    WHERE tenant_id = ${tenantId}
    ORDER BY updated_at DESC
  `;
  return rows.length;
});

await check("contacts+children", async () => {
  const contacts = await sql`
    SELECT id FROM lean_event_contacts WHERE tenant_id = ${tenantId}
  `;
  if (!contacts[0]) return 0;
  const id = contacts[0].id;
  const emails = await sql`
    SELECT COUNT(*)::int AS n FROM lean_event_contact_emails
    WHERE tenant_id = ${tenantId} AND contact_id = ${id}
  `;
  const phones = await sql`
    SELECT COUNT(*)::int AS n FROM lean_event_contact_phones
    WHERE tenant_id = ${tenantId} AND contact_id = ${id}
  `;
  return contacts.length + (emails[0]?.n ?? 0) + (phones[0]?.n ?? 0);
});

await check("assignments FK", async () => {
  const rows = await sql`
    SELECT a.id, a.event_id, a.contact_id
    FROM lean_event_assignments a
    JOIN lean_event_events e
      ON e.tenant_id = a.tenant_id AND e.id = a.event_id
    JOIN lean_event_contacts c
      ON c.tenant_id = a.tenant_id AND c.id = a.contact_id
    WHERE a.tenant_id = ${tenantId}
  `;
  return rows.length;
});

await check("venues", async () => {
  const rows = await sql`
    SELECT id FROM lean_event_venues WHERE tenant_id = ${tenantId}
  `;
  return rows.length;
});

await check("workspaces", async () => {
  const rows = await sql`
    SELECT id, linked_event_id FROM lean_event_workspaces
    WHERE tenant_id = ${tenantId}
  `;
  return rows.length;
});

// Toggle favorite roundtrip (write path column)
const event = (
  await sql`
    SELECT id, is_favorite, revision FROM lean_event_events
    WHERE tenant_id = ${tenantId}
    ORDER BY updated_at DESC
    LIMIT 1
  `
)[0];

if (event) {
  const next = !event.is_favorite;
  await sql`
    UPDATE lean_event_events
    SET is_favorite = ${next},
        updated_at = now(),
        revision = revision + 1
    WHERE tenant_id = ${tenantId} AND id = ${event.id}
  `;
  // also patch payload mirror if present
  await sql`
    UPDATE lean_event_entities
    SET payload = jsonb_set(
      COALESCE(payload, '{}'::jsonb),
      '{isFavorite}',
      ${JSON.stringify(next)}::jsonb,
      true
    ),
    revision = revision + 1,
    updated_at = now()
    WHERE tenant_id = ${tenantId}
      AND entity_type = 'event'
      AND id = ${event.id}
  `;
  const verify = await sql`
    SELECT is_favorite FROM lean_event_events
    WHERE tenant_id = ${tenantId} AND id = ${event.id}
  `;
  const ok = verify[0]?.is_favorite === next;
  console.log(
    ok
      ? `OK favorite toggle → ${next}`
      : `FAIL favorite toggle expected ${next} got ${verify[0]?.is_favorite}`
  );
  checks.push({ name: "favorite_toggle", ok });
  // restore
  await sql`
    UPDATE lean_event_events
    SET is_favorite = ${event.is_favorite}, updated_at = now()
    WHERE tenant_id = ${tenantId} AND id = ${event.id}
  `;
}

const failed = checks.filter((c) => !c.ok);
console.log(
  failed.length
    ? `SMOKE FAIL ${failed.length}/${checks.length}`
    : `SMOKE OK ${checks.length}/${checks.length}`
);
process.exit(failed.length ? 1 : 0);
