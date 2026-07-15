"use client";

import { useState, FormEvent } from "react";
import { ArrowIcon } from "@/components/homepage/Icons";

interface ContactFormProps {
  title: string;
  description: string;
  submitLabel: string;
}

export function ContactForm({ title, description, submitLabel }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-leanme-purple/30 bg-leanme-purple/10 p-8 text-center">
        <p className="text-lg font-medium text-leanme-purple">
          Messaggio inviato con successo.
        </p>
        <p className="mt-2 text-sm text-white/65">
          Ti risponderemo al più presto.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-leanme-purple";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/10 bg-[#111111] p-8"
      aria-labelledby="contact-form-title"
    >
      <h3 id="contact-form-title" className="text-xl font-bold text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm text-white/60">{description}</p>

      <div className="mt-8 grid gap-6">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-white/80">
            Nome e cognome
          </label>
          <input id="name" name="name" type="text" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-white/80">
            Email
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="message" className="mb-2 block text-sm font-medium text-white/80">
            Messaggio
          </label>
          <textarea id="message" name="message" rows={5} required className={inputClass} />
        </div>
      </div>

      <button
        type="submit"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-leanme-purple px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-leanme-purple/90"
      >
        {submitLabel}
        <ArrowIcon />
      </button>
    </form>
  );
}
