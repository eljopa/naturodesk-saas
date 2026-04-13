import { db } from "@/lib/db";

interface LogAdminActionParams {
  adminId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
}

/**
 * Persiste une entrée d'audit pour les actions sensibles du super admin.
 * Silent fail — ne doit jamais bloquer l'action principale.
 */
export async function logAdminAction({
  adminId,
  action,
  targetType,
  targetId,
  meta,
}: LogAdminActionParams): Promise<void> {
  try {
    await db.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metaJson: meta as any,
      },
    });
  } catch {
    // Silent — audit log must never crash the main operation
  }
}
