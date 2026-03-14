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
      ...(input.payload !== undefined && input.payload !== null && { payload: input.payload as object }),
      ipAddress: input.ipAddress ?? null,
    },
  });
}

