import { generateLlmsTxt, resolveLlmsTxtBaseUrl } from "@/lib/llms-txt";

export function GET(request: Request) {
  const baseUrl = resolveLlmsTxtBaseUrl(request);
  const content = generateLlmsTxt(baseUrl);

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
