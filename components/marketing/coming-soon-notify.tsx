"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export function ComingSoonNotify() {
  const t = useTranslations("marketing.ressources.comingSoon");
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    // Fire-and-forget — no backend yet
    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-[15px] font-semibold py-3 px-5 rounded-xl inline-block"
        style={{ background: "var(--nd-sage-tint)", color: "var(--nd-sage-deep)" }}>
        {t("notifySuccess")}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder={t("notifyPlaceholder")}
        className="flex-1 rounded-full px-4 py-3 text-[14px] text-slate-900"
        style={{ border: "1.5px solid var(--nd-line)", outline: "none" }}
      />
      <button
        type="submit"
        className="px-5 py-3 rounded-full font-bold text-white text-[14px] flex-shrink-0 transition-opacity hover:opacity-90"
        style={{ background: "var(--nd-sage)" }}
      >
        {t("notifyButton")}
      </button>
    </form>
  );
}
