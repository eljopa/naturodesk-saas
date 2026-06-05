import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.legal.mentions.meta");
  return { title: t("title"), description: t("description") };
}

export default async function MentionsPage() {
  const t = await getTranslations("marketing.legal.mentions");

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-10">{t("title")}</h1>
      <div className="space-y-8 text-slate-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Éditeur du site</h2>
          <p>NaturoDesk — éditeur SaaS</p>
          <p>
            Email de contact :{" "}
            <a href="mailto:contact@naturodesk.fr" className="text-teal-700 underline">
              contact@naturodesk.fr
            </a>
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Hébergement</h2>
          <p>
            Ce site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA.
            Les données sont stockées sur des serveurs Supabase situés en Union Européenne.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Propriété intellectuelle</h2>
          <p>
            L&apos;ensemble des contenus présents sur ce site (textes, images, logos) est la
            propriété exclusive de NaturoDesk. Toute reproduction est interdite sans
            autorisation préalable.
          </p>
        </section>
      </div>
    </div>
  );
}
