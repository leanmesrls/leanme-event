"use client";

import Script from "next/script";
import { useEffect } from "react";

export interface JotFormEmbedConfig {
  iframeId: string;
  title: string;
  src: string;
  embedHandlerOrigin: string;
}

interface JotFormEmbedProps {
  form: JotFormEmbedConfig;
}

declare global {
  interface Window {
    jotformEmbedHandler?: (selector: string, origin: string) => void;
  }
}

export function JotFormEmbed({ form }: JotFormEmbedProps) {
  useEffect(() => {
    if (typeof window.jotformEmbedHandler === "function") {
      window.jotformEmbedHandler(
        `iframe[id='${form.iframeId}']`,
        form.embedHandlerOrigin
      );
    }
  }, [form.embedHandlerOrigin, form.iframeId]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111111]">
      <iframe
        id={form.iframeId}
        title={form.title}
        onLoad={() => window.scrollTo(0, 0)}
        allowTransparency
        allow="geolocation; microphone; camera; fullscreen; payment"
        src={form.src}
        className="min-h-[539px] w-full min-w-full max-w-full border-0"
        scrolling="no"
      />
      <Script
        src="https://cdn.jotfor.ms/s/umd/latest/for-form-embed-handler.js"
        strategy="afterInteractive"
        onReady={() => {
          window.jotformEmbedHandler?.(
            `iframe[id='${form.iframeId}']`,
            form.embedHandlerOrigin
          );
        }}
      />
    </div>
  );
}
