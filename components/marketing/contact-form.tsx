"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ContactForm() {
  const t = useTranslations("marketing.contact.form");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      subject: (form.elements.namedItem("subject") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/marketing/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 px-6 py-8 text-center">
        <p className="font-semibold text-teal-800 text-lg">{t("successTitle")}</p>
        <p className="mt-1 text-sm text-teal-700">{t("successBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label={t("nameLabel")}>
          <input
            name="name"
            required
            placeholder={t("namePlaceholder")}
            className={inputCls}
          />
        </Field>
        <Field label={t("emailLabel")}>
          <input
            name="email"
            type="email"
            required
            placeholder={t("emailPlaceholder")}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label={t("subjectLabel")}>
        <input
          name="subject"
          required
          placeholder={t("subjectPlaceholder")}
          className={inputCls}
        />
      </Field>

      <Field label={t("messageLabel")}>
        <textarea
          name="message"
          required
          rows={5}
          placeholder={t("messagePlaceholder")}
          className={cn(inputCls, "resize-none")}
        />
      </Field>

      {status === "error" && (
        <p className="text-sm text-red-600">{t("errorGeneric")}</p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={status === "submitting"}
        className="w-full"
      >
        {status === "submitting" ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition";
