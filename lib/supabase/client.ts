"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase pour le navigateur (Client Components uniquement).
 * Expose uniquement la clé anon — jamais la service role key.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
