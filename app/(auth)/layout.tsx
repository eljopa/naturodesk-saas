import { Leaf } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Branding */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-teal-700">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-semibold text-slate-900 tracking-tight">
          {t("brandName")}
        </span>
      </div>

      {/* Carte */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        {children}
      </div>

      {/* Mention légale */}
      <p className="mt-8 text-xs text-slate-400 text-center max-w-xs">
        {t("disclaimer")}
      </p>
    </div>
  );
}
