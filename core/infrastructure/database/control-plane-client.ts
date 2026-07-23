import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import { requireControlPlaneDatabaseUrl } from "@/core/infrastructure/database/secret-refs";

let cached: NeonQueryFunction<false, false> | null = null;

export function getControlPlaneSql(): NeonQueryFunction<false, false> {
  if (!cached) {
    cached = neon(requireControlPlaneDatabaseUrl());
  }
  return cached;
}
