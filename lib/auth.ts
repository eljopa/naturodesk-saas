import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { UserRole } from "@prisma/client";

/**
 * Retourne la session Supabase courante.
 * Retourne null si non connecté.
 */
export async function getSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Retourne l'utilisateur Supabase courant.
 * Retourne null si non connecté.
 */
export async function getAuthUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Retourne le profil praticien depuis la table `users` (Prisma).
 * Redirige vers /login si non connecté.
 * Redirige vers /onboarding si Supabase user existe mais pas de profil Prisma.
 * Redirige vers /login si le compte est soft-deleted.
 */
export async function requireUser(): Promise<User> {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { authId: authUser.id },
  });

  if (!user) {
    redirect("/onboarding");
  }

  // Compte supprimé (soft delete) → déconnexion forcée
  if (user.deletedAt !== null) {
    redirect("/login");
  }

  return user;
}

/**
 * Retourne le profil praticien ou null — sans redirection.
 * Utile pour les layouts qui doivent gérer l'état non-connecté.
 */
export async function getCurrentUser(): Promise<User | null> {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const user = await db.user.findUnique({
    where: { authId: authUser.id },
  });

  // Ne pas retourner un compte soft-deleted
  if (!user || user.deletedAt !== null) return null;
  return user;
}

/**
 * Vérifie que l'utilisateur courant est ADMIN ou SUPER_ADMIN.
 * ADMIN → gestion utilisateurs + support.
 * SUPER_ADMIN → accès total.
 * Redirige vers /dashboard si accès insuffisant.
 */
export async function requireAdmin(): Promise<User> {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { authId: authUser.id },
  });

  if (!user || user.deletedAt !== null) {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    redirect("/dashboard");
  }

  return user;
}

/**
 * Vérifie que l'utilisateur courant est SUPER_ADMIN.
 * Réservé aux opérations sensibles : billing, suspension de compte, audit.
 * Redirige vers /admin (dashboard admin) si ADMIN simple.
 * Redirige vers /dashboard si non admin.
 */
export async function requireSuperAdmin(): Promise<User> {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { authId: authUser.id },
  });

  if (!user || user.deletedAt !== null) {
    redirect("/login");
  }

  if (user.role === UserRole.PRACTITIONER) {
    redirect("/dashboard");
  }

  if (user.role === UserRole.ADMIN) {
    // ADMIN simple n'a pas accès aux zones SUPER_ADMIN
    redirect("/admin");
  }

  return user;
}

/**
 * Vérifie si un utilisateur est ADMIN ou SUPER_ADMIN (sans redirection).
 * Utile pour les composants qui adaptent leur UI selon le rôle.
 */
export function isAdminRole(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
}

export function isSuperAdminRole(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN;
}
