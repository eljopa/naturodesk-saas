import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Mail, Clock } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.contact.meta");
  return { title: t("title"), description: t("description") };
}

export default async function ContactPage() {
  const t = await getTranslations("marketing.contact");

  return (
    <>
      {/* Header */}
      <section className="bg-slate-50 border-b border-slate-200 py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-4 text-lg text-slate-600">{t("subtitle")}</p>
        </div>
      </section>

      {/* Two-column: form + info */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto grid md:grid-cols-5 gap-12">
          {/* Form — 3 cols */}
          <div className="md:col-span-3">
            <ContactForm />
          </div>

          {/* Info — 2 cols */}
          <div className="md:col-span-2">
            <h2 className="text-base font-semibold text-slate-900 mb-6">
              {t("info.title")}
            </h2>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-teal-700 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">
                    {t("info.emailLabel")}
                  </p>
                  <a
                    href={`mailto:${t("info.email")}`}
                    className="text-sm text-slate-900 hover:text-teal-700 transition-colors"
                  >
                    {t("info.email")}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-teal-700 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-600">{t("info.responseTime")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
