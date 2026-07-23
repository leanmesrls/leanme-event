/**
 * Probe whether CREATE DATABASE is allowed via LEAN_EVENT_DATABASE_URL.
 * Does not leave a database behind if creation fails mid-way.
 * If creation succeeds for a probe name, drops it immediately.
 */
import { neon } from "@neondatabase/serverless";

const url = process.env.LEAN_EVENT_DATABASE_URL?.trim();
if (!url) {
  console.log("RESULT=NO_URL");
  process.exit(0);
}

const sql = neon(url);
const probeName = "lean_event_probe_delete_me";

try {
  await sql.query(`CREATE DATABASE ${probeName}`);
  console.log("CREATE_DATABASE=ALLOWED");
  try {
    await sql.query(`DROP DATABASE ${probeName}`);
    console.log("DROP_DATABASE=OK");
  } catch (error) {
    console.log(
      "DROP_DATABASE=FAIL:" +
        (error instanceof Error ? error.message : String(error))
    );
  }
} catch (error) {
  console.log(
    "CREATE_DATABASE=DENIED:" +
      (error instanceof Error ? error.message : String(error))
  );
}
