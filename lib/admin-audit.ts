import { prisma } from "@/db";

interface AuditPayload {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: unknown;
  ipAddress?: string | null;
}

export async function logAdminAction(input: AuditPayload) {
  await prisma.adminAuditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      payload: input.payload ?? null,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

