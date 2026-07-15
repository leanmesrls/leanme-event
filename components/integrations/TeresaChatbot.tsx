import Script from "next/script";

const JOTFORM_AGENT_SRC =
  "https://cdn.jotfor.ms/agent/embedjs/0199521b7f277f26b1931b19413c131c8f8e/embed.js";

export function TeresaChatbot() {
  return (
    <Script
      id="teresa-chatbot"
      src={JOTFORM_AGENT_SRC}
      strategy="lazyOnload"
    />
  );
}
