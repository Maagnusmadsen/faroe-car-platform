/**
 * Notification system observability.
 * Queries for admin visibility: enqueue failures, failed deliveries, retries, email failures.
 */

import { prisma } from "@/db";
import { MAX_DELIVERY_ATTEMPTS } from "./retry";

export interface NotificationObservabilitySummary {
  enqueueFailures: number;
  failedDeliveries: number;
  pendingRetry: number;
  exhaustedRetries: number;
  recentEmailFailures: number;
}

export interface EnqueueFailureRow {
  id: string;
  eventType: string;
  idempotencyKey: string;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
  enqueueError: string | null;
}

export interface FailedDeliveryRow {
  id: string;
  eventId: string;
  userId: string;
  channel: string;
  status: string;
  attemptCount: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  nextRetryAt: string | null;
  event: { eventType: string; idempotencyKey: string };
  user: { email: string; name: string | null };
}

export interface RecentEmailFailureRow {
  id: string;
  deliveryId: string;
  toEmail: string;
  subject: string;
  status: string;
  statusCode: number | null;
  createdAt: string;
  rawResponse: unknown;
}

export async function getNotificationObservabilitySummary(): Promise<NotificationObservabilitySummary> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days

  const [enqueueFailures, failedDeliveries, pendingRetry, exhaustedRetries, recentEmailFailures] =
    await Promise.all([
      prisma.notificationEvent.count({
        where: { enqueuedAt: null, createdAt: { gte: cutoff } },
      }),
      prisma.notificationDelivery.count({
        where: { status: "FAILED" },
      }),
      prisma.notificationDelivery.count({
        where: {
          status: "FAILED",
          nextRetryAt: { lte: new Date(), not: null },
          attemptCount: { lt: MAX_DELIVERY_ATTEMPTS },
        },
      }),
      prisma.notificationDelivery.count({
        where: {
          status: "FAILED",
          attemptCount: { gte: MAX_DELIVERY_ATTEMPTS },
        },
      }),
      prisma.emailLog.count({
        where: {
          status: "FAILED",
          createdAt: { gte: cutoff },
        },
      }),
    ]);

  return {
    enqueueFailures,
    failedDeliveries,
    pendingRetry,
    exhaustedRetries,
    recentEmailFailures,
  };
}

export async function getEnqueueFailures(limit = 50): Promise<EnqueueFailureRow[]> {
  const rows = await prisma.notificationEvent.findMany({
    where: { enqueuedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      eventType: true,
      idempotencyKey: true,
      sourceType: true,
      sourceId: true,
      createdAt: true,
      enqueueError: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getFailedDeliveries(limit = 50): Promise<FailedDeliveryRow[]> {
  const rows = await prisma.notificationDelivery.findMany({
    where: { status: "FAILED" },
    orderBy: { lastAttemptAt: "desc" },
    take: limit,
    include: {
      event: { select: { eventType: true, idempotencyKey: true } },
    },
  });
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({
    ...r,
    user: userMap.get(r.userId) ?? { email: "—", name: null },
    lastAttemptAt: r.lastAttemptAt?.toISOString() ?? null,
    nextRetryAt: r.nextRetryAt?.toISOString() ?? null,
  }));
}

export async function getPendingRetries(limit = 50): Promise<FailedDeliveryRow[]> {
  const rows = await prisma.notificationDelivery.findMany({
    where: {
      status: "FAILED",
      nextRetryAt: { lte: new Date(), not: null },
      attemptCount: { lt: MAX_DELIVERY_ATTEMPTS },
    },
    orderBy: { nextRetryAt: "asc" },
    take: limit,
    include: {
      event: { select: { eventType: true, idempotencyKey: true } },
    },
  });
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({
    ...r,
    user: userMap.get(r.userId) ?? { email: "—", name: null },
    lastAttemptAt: r.lastAttemptAt?.toISOString() ?? null,
    nextRetryAt: r.nextRetryAt?.toISOString() ?? null,
  }));
}

export async function getExhaustedRetries(limit = 50): Promise<FailedDeliveryRow[]> {
  const rows = await prisma.notificationDelivery.findMany({
    where: {
      status: "FAILED",
      attemptCount: { gte: MAX_DELIVERY_ATTEMPTS },
    },
    orderBy: { lastAttemptAt: "desc" },
    take: limit,
    include: {
      event: { select: { eventType: true, idempotencyKey: true } },
    },
  });
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => ({
    ...r,
    user: userMap.get(r.userId) ?? { email: "—", name: null },
    lastAttemptAt: r.lastAttemptAt?.toISOString() ?? null,
    nextRetryAt: r.nextRetryAt?.toISOString() ?? null,
  }));
}

export async function getRecentEmailFailures(limit = 50): Promise<RecentEmailFailureRow[]> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await prisma.emailLog.findMany({
    where: { status: "FAILED", createdAt: { gte: cutoff } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      deliveryId: true,
      toEmail: true,
      subject: true,
      status: true,
      statusCode: true,
      createdAt: true,
      rawResponse: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}
