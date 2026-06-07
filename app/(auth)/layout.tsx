import Image from "next/image";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen bg-nd-cream flex flex-col items-center justify-center p-4">
      {/* Branding */}
      <div className="mb-8">
        <Image
          src="/images/logo-nav.png"
          alt="NaturoDesk"
          width={148}
          height={34}
          className="h-9 w-auto"
          priority
        />
      </div>

      {/* Carte */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-nd-line shadow-sm p-8">
        {children}
      </div>

      {/* Mention légale */}
      <p className="mt-8 text-xs text-slate-400 text-center max-w-xs">
        {t("disclaimer")}
      </p>
    </div>
  );
}
