import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Crée un client Supabase côté serveur (Server Components, Server Actions, Route Handlers).
 * Utilise les cookies Next.js pour persister la session.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll peut échouer dans les Server Components (read-only).
            // Ignoré — le middleware gère le rafraîchissement de session.
          }
        },
      },
    }
  );
}

/**
 * Client Supabase avec service_role — accès admin, bypass RLS.
 * Utiliser uniquement dans des contextes serveur de confiance.
 */
export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
