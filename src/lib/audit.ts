import { prisma } from "./db";

/**
 * Record an audit log entry.
 * Call this at the end of any destructive API operation.
 */
export async function audit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  diff?: Record<string, unknown>
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      targetType,
      targetId,
      diff: diff ? JSON.stringify(diff) : null,
    },
  });
}
