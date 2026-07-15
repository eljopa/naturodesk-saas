import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Inject the current pathname into forwarded request headers so that
  // server layouts can read it via headers() — used for subscription gating.
  const modifiedHeaders = new Headers(request.headers);
  modifiedHeaders.set("x-pathname", pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: modifiedHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Preserve modifiedHeaders so x-pathname is not lost on cookie refresh
          supabaseResponse = NextResponse.next({
            request: { headers: modifiedHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Rafraîchit la session — NE PAS supprimer cet appel
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Routes accessibles sans authentification
  const authPaths = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
  ];
  const alwaysPublicPaths = [
    ...authPaths,
    "/register",
    "/",                  // home marketing
    "/fonctionnalites",
    "/tarifs",
    "/blog",
    "/a-propos",
    "/faq",               // redirects to /ressources/centre-aide
    "/ressources/",
    "/contact",
    "/legal/",
    "/p/",                // pages publiques thérapeutes
    "/api/public/",       // API publiques (slots, contact, booking)
    "/api/marketing/",
    "/api/stripe/",       // Stripe webhooks (pas de session Supabase)
    "/api/cron/",         // Vercel Cron (pas de session Supabase — protégé par CRON_SECRET dans chaque route)
  ];
  const isAlwaysPublic = alwaysPublicPaths.some((path) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path)
  );

  // Les routes /admin/* sont protégées par le rôle ADMIN côté serveur (requireAdmin()).
  // Le middleware garantit uniquement que l'utilisateur est authentifié.
  // Redirection non-admin → /dashboard gérée par requireAdmin() dans le layout.

  // Non connecté + route protégée → redirige vers /login
  if (!user && !isAlwaysPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Déjà connecté sur une page auth pure → redirige vers le dashboard
  if (user && authPaths.some((p) => pathname.startsWith(p)) && pathname !== "/auth/callback") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
