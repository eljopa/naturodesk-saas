import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.legal.cookies.meta");
  return { title: t("title"), description: t("description") };
}

export default async function CookiesPage() {
  const t = await getTranslations("marketing.legal.cookies");

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{t("title")}</h1>
      <p className="text-sm text-slate-500 mb-10">
        {t("lastUpdated", { date: "1er juin 2026" })}
      </p>
      <div className="space-y-8 text-slate-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Cookies utilisés</h2>
          <p>
            NaturoDesk utilise uniquement des cookies strictement nécessaires au
            fonctionnement de l&apos;application (session d&apos;authentification, préférence de
            langue). Aucun cookie publicitaire ou de suivi tiers n&apos;est déposé.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Cookie de langue</h2>
          <p>
            Le cookie <code className="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono">NEXT_LOCALE</code>{" "}
            mémorise votre préférence de langue (fr ou en). Il expire à la fermeture du navigateur.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Cookie de session</h2>
          <p>
            Les cookies de session Supabase (
            <code className="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono">sb-*</code>)
            maintiennent votre connexion active. Ils sont sécurisés (
            <code className="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono">HttpOnly</code>,{" "}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-sm font-mono">SameSite=Lax</code>)
            et expirent automatiquement.
          </p>
        </section>
      </div>
    </div>
  );
}
