import { serve } from "inngest/next";

import { inngest } from "@/core/infrastructure/jobs/inngest-client";
import { leanEventInngestFunctions } from "@/core/infrastructure/jobs/inngest-functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: leanEventInngestFunctions,
});
