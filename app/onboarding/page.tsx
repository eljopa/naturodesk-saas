import { Leaf } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { signOutAction } from "@/lib/actions/auth";
import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

/**
 * Safety-net page: Supabase user exists but no Prisma profile yet.
 * Must NOT call requireUser() to avoid the redirect loop.
 */
export default async function OnboardingPage() {
  const t = await getTranslations("onboarding");

  const authUser = await getAuthUser();

  // If somehow not authenticated, go to login
  if (!authUser) redirect("/login");

  // If profile already exists, go to dashboard
  const existing = await db.user.findUnique({
    where: { authId: authUser.id },
  });
  if (existing) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Branding */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-teal-700">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-semibold text-slate-900 tracking-tight">
          NaturoDesk
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">
            {t("title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>

        <OnboardingForm email={authUser.email ?? undefined} />
      </div>

      {/* Logout link */}
      <form action={signOutAction} className="mt-6">
        <button
          type="submit"
          className="text-sm text-slate-400 hover:text-slate-600 hover:underline transition-colors"
        >
          {t("logout")}
        </button>
      </form>
    </div>
  );
}
