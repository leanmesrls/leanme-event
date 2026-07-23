import { neon } from "@neondatabase/serverless";

const cp = process.env.LEAN_EVENT_CONTROL_PLANE_DATABASE_URL?.trim();
const iec = process.env.LEAN_EVENT_TENANT_IEC_DATABASE_URL?.trim();
console.log(`CP=${cp ? "SET" : "MISSING"}`);
console.log(`IEC=${iec ? "SET" : "MISSING"}`);
if (!cp || !iec) process.exit(1);
const a = await neon(cp)`select current_database() as d`;
const b = await neon(iec)`select current_database() as d`;
console.log(`CP_DB=${a[0].d}`);
console.log(`IEC_DB=${b[0].d}`);
