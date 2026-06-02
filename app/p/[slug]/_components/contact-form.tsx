"use client";

import { useState } from "react";
import { Send } from "lucide-react";

interface ContactFormProps {
  slug: string;
}

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm({ slug }: ContactFormProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const fd = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/public/${slug}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName:  fd.get("senderName"),
          senderEmail: fd.get("senderEmail"),
          senderPhone: fd.get("senderPhone") || undefined,
          message:     fd.get("message"),
          honeypot:    fd.get("hp") ?? "",
        }),
      });

      if (res.ok) {
        setStatus("success");
      } else if (res.status === 429) {
        setErrorMsg("Trop de messages envoyés. Veuillez réessayer dans quelques minutes.");
        setStatus("error");
      } else {
        setErrorMsg("Une erreur est survenue. Veuillez réessayer.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Impossible d'envoyer le message. Vérifiez votre connexion.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-xl bg-teal-50 border border-teal-200 p-6 text-center">
        <p className="text-teal-700 font-medium">Message envoyé avec succès !</p>
        <p className="text-teal-600 text-sm mt-1">Je vous répondrai dans les meilleurs délais.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot — invisible pour les humains */}
      <input
        type="text"
        name="hp"
        defaultValue=""
        aria-hidden="true"
        tabIndex={-1}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
      />

      {errorMsg && (
        <p className="text-red-600 text-sm rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          {errorMsg}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cf-name" className="text-sm font-medium text-slate-700">
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            id="cf-name"
            name="senderName"
            type="text"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            disabled={status === "submitting"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cf-email" className="text-sm font-medium text-slate-700">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="cf-email"
            name="senderEmail"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            disabled={status === "submitting"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="cf-phone" className="text-sm font-medium text-slate-700">
          Téléphone <span className="text-slate-400 font-normal">(optionnel)</span>
        </label>
        <input
          id="cf-phone"
          name="senderPhone"
          type="tel"
          maxLength={30}
          autoComplete="tel"
          disabled={status === "submitting"}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="cf-message" className="text-sm font-medium text-slate-700">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="cf-message"
          name="message"
          required
          minLength={10}
          maxLength={1500}
          rows={5}
          disabled={status === "submitting"}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
        {status === "submitting" ? "Envoi en cours…" : "Envoyer le message"}
      </button>
    </form>
  );
}
