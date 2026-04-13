import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata.pages");
  return { title: t("login") };
}

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const t = await getTranslations("auth.login");
  const tAuth = await getTranslations("auth");
  const params = await searchParams;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("subtitle")}</p>
      </div>

      {params.error === "auth_callback_failed" && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700"
        >
          {tAuth("callbackError")}
        </div>
      )}

      <LoginForm redirectTo={params.redirectTo} />
    </>
  );
}
