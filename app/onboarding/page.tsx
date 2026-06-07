import Image from "next/image";
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
    <div className="nd-surface min-h-screen bg-nd-cream flex flex-col items-center justify-center p-4">
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

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-nd-line shadow-sm p-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-nd-forest">
            {t("title")}
          </h1>
          <p className="text-sm text-nd-muted mt-1">{t("subtitle")}</p>
        </div>

        <OnboardingForm email={authUser.email ?? undefined} />
      </div>

      {/* Logout link */}
      <form action={signOutAction} className="mt-6">
        <button
          type="submit"
          className="text-sm text-nd-muted hover:text-nd-forest hover:underline transition-colors"
        >
          {t("logout")}
        </button>
      </form>
    </div>
  );
}
