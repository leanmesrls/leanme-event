"use client";

import Script from "next/script";
import { useEffect } from "react";
import type { ContactData } from "@/types/content";

interface ContactFormEmbedProps {
  form: ContactData["form"];
}

declare global {
  interface Window {
    jotformEmbedHandler?: (selector: string, origin: string) => void;
  }
}

export function ContactFormEmbed({ form }: ContactFormEmbedProps) {
  const hasEmbed = Boolean(form.iframeSrc && form.iframeId);

  useEffect(() => {
    if (
      hasEmbed &&
      form.iframeId &&
      form.embedHandlerOrigin &&
      typeof window.jotformEmbedHandler === "function"
    ) {
      window.jotformEmbedHandler(
        `iframe[id='${form.iframeId}']`,
        form.embedHandlerOrigin
      );
    }
  }, [form.embedHandlerOrigin, form.iframeId, hasEmbed]);

  if (hasEmbed && form.iframeSrc && form.iframeId) {
    return (
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111111]">
        <iframe
          id={form.iframeId}
          title={form.title}
          onLoad={() => window.scrollTo(0, 0)}
          allowTransparency
          allow="geolocation; microphone; camera; fullscreen; payment"
          src={form.iframeSrc}
          className="min-h-[539px] w-full min-w-full max-w-full border-0"
          scrolling="no"
        />
        <Script
          src="https://cdn.jotfor.ms/s/umd/latest/for-form-embed-handler.js"
          strategy="afterInteractive"
          onReady={() => {
            if (form.embedHandlerOrigin) {
              window.jotformEmbedHandler?.(
                `iframe[id='${form.iframeId}']`,
                form.embedHandlerOrigin
              );
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-label={form.title}
      className="flex min-h-[320px] flex-col justify-center rounded-xl border border-white/10 bg-[#111111] p-8 text-center md:p-10"
    >
      <h2 className="text-lg font-bold text-white">{form.title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-white/55 md:text-base">
        {form.description}
      </p>
      <p className="mt-6 text-xs uppercase tracking-[0.12em] text-white/35">
        Modulo iframe in configurazione
      </p>
    </div>
  );
}
