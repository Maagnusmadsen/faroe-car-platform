"use client";

import { useCallback, useEffect, useState } from "react";
import AdminSection from "@/components/admin/AdminSection";

type Summary = {
  enqueueFailures: number;
  failedDeliveries: number;
  pendingRetry: number;
  exhaustedRetries: number;
  recentEmailFailures: number;
};

type EnqueueFailure = {
  id: string;
  eventType: string;
  idempotencyKey: string;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
  enqueueError: string | null;
};

type FailedDelivery = {
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
};

type EmailFailure = {
  id: string;
  deliveryId: string;
  toEmail: string;
  subject: string;
  status: string;
  statusCode: number | null;
  createdAt: string;
};

type ObservabilityData = {
  summary: Summary;
  enqueueFailures: EnqueueFailure[];
  failedDeliveries: FailedDelivery[];
  pendingRetries: FailedDelivery[];
  exhaustedRetries: FailedDelivery[];
  recentEmailFailures: EmailFailure[];
};

function TableCard({
  id,
  title,
  subtitle,
  variant = "default",
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  variant?: "default" | "error" | "warning";
  children: React.ReactNode;
}) {
  const variants = {
    default: "border-slate-200 bg-white",
    error: "border-red-200 bg-red-50/50",
    warning: "border-amber-200 bg-amber-50/50",
  };
  const headerVariants = {
    default: "border-slate-100",
    error: "border-red-100 bg-red-50/50",
    warning: "border-amber-100 bg-amber-50/50",
  };
  const textVariants = {
    default: { title: "text-slate-900", sub: "text-slate-500" },
    error: { title: "text-red-900", sub: "text-red-700" },
    warning: { title: "text-amber-900", sub: "text-amber-800" },
  };
  const t = textVariants[variant];
  return (
    <div id={id} className={`rounded-xl border ${variants[variant]}`}>
      <div className={`border-b px-4 py-3 ${headerVariants[variant]}`}>
        <h2 className={`font-semibold ${t.title}`}>{title}</h2>
        {subtitle && <p className={`text-xs ${t.sub}`}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function AdminNotificationsPage() {
  const [data, setData] = useState<ObservabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications/observability");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">{error ?? "Failed to load"}</p>
      </div>
    );
  }

  const { summary, enqueueFailures, failedDeliveries, pendingRetries, exhaustedRetries, recentEmailFailures } = data;
  const hasIssues =
    summary.enqueueFailures > 0 ||
    summary.failedDeliveries > 0 ||
    summary.exhaustedRetries > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-500">
          System health, failures, retries, and delivery status
        </p>
      </div>

      {!hasIssues && (
        <div className="rounded-xl border border-brand/20 bg-brand/5 p-6">
          <p className="font-medium text-slate-800">No notification issues</p>
          <p className="mt-1 text-sm text-slate-600">
            No enqueue failures, failed deliveries, or exhausted retries.
          </p>
        </div>
      )}

      <AdminSection title="Summary" subtitle="Counts (last 7 days for enqueue/email failures)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div
            className={`rounded-xl border p-4 ${summary.enqueueFailures > 0 ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-white"}`}
          >
            <p className="text-sm font-medium text-slate-500">Enqueue failures</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.enqueueFailures}</p>
            <p className="text-xs text-slate-400">events not sent to Inngest</p>
          </div>
          <div
            className={`rounded-xl border p-4 ${summary.failedDeliveries > 0 ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-white"}`}
          >
            <p className="text-sm font-medium text-slate-500">Failed deliveries</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.failedDeliveries}</p>
            <p className="text-xs text-slate-400">total FAILED</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-500">Pending retry</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.pendingRetry}</p>
            <p className="text-xs text-slate-400">due, will be retried by cron</p>
          </div>
          <div
            className={`rounded-xl border p-4 ${summary.exhaustedRetries > 0 ? "border-red-200 bg-red-50/50" : "border-slate-200 bg-white"}`}
          >
            <p className="text-sm font-medium text-slate-500">Exhausted retries</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.exhaustedRetries}</p>
            <p className="text-xs text-slate-400">max attempts reached</p>
          </div>
          <div
            className={`rounded-xl border p-4 ${summary.recentEmailFailures > 0 ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-white"}`}
          >
            <p className="text-sm font-medium text-slate-500">Email failures (7d)</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.recentEmailFailures}</p>
            <p className="text-xs text-slate-400">EmailLog FAILED</p>
          </div>
        </div>
      </AdminSection>

      {enqueueFailures.length > 0 && (
        <AdminSection title="Enqueue failures" subtitle="Events that failed to reach Inngest">
          <TableCard id="enqueue" title="Enqueue failures" variant="error">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-700">Event</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Source</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Created</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {enqueueFailures.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{r.eventType}</p>
                        <p className="text-xs text-slate-500 font-mono">{r.idempotencyKey.slice(0, 24)}…</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.sourceType}/{r.sourceId ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-red-700 max-w-xs truncate" title={r.enqueueError ?? ""}>
                        {r.enqueueError ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCard>
        </AdminSection>
      )}

      {failedDeliveries.length > 0 && (
        <AdminSection title="Failed deliveries" subtitle="All FAILED deliveries (up to 50)">
          <TableCard id="failed" title="Failed deliveries" variant="warning">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-700">User</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Channel</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Event</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Attempts</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {failedDeliveries.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-slate-900">{r.user.email}</td>
                      <td className="px-4 py-3 text-slate-600">{r.channel}</td>
                      <td className="px-4 py-3 text-slate-600">{r.event.eventType}</td>
                      <td className="px-4 py-3 text-slate-600">{r.attemptCount}</td>
                      <td className="px-4 py-3 text-red-700 max-w-xs truncate" title={r.lastError ?? ""}>
                        {r.lastError ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCard>
        </AdminSection>
      )}

      {pendingRetries.length > 0 && (
        <AdminSection title="Pending retries" subtitle="FAILED deliveries due for retry (next cron run)">
          <TableCard id="pending" title="Pending retries" variant="default">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-700">User</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Channel</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Event</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Next retry</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRetries.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-slate-900">{r.user.email}</td>
                      <td className="px-4 py-3 text-slate-600">{r.channel}</td>
                      <td className="px-4 py-3 text-slate-600">{r.event.eventType}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.nextRetryAt ? new Date(r.nextRetryAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCard>
        </AdminSection>
      )}

      {exhaustedRetries.length > 0 && (
        <AdminSection title="Exhausted retries" subtitle="Deliveries that hit max attempts (manual attention)">
          <TableCard id="exhausted" title="Exhausted retries" variant="error">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-700">User</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Channel</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Event</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Attempts</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Last error</th>
                  </tr>
                </thead>
                <tbody>
                  {exhaustedRetries.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-slate-900">{r.user.email}</td>
                      <td className="px-4 py-3 text-slate-600">{r.channel}</td>
                      <td className="px-4 py-3 text-slate-600">{r.event.eventType}</td>
                      <td className="px-4 py-3 text-slate-600">{r.attemptCount}</td>
                      <td className="px-4 py-3 text-red-700 max-w-xs truncate" title={r.lastError ?? ""}>
                        {r.lastError ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCard>
        </AdminSection>
      )}

      {recentEmailFailures.length > 0 && (
        <AdminSection title="Recent email failures" subtitle="EmailLog FAILED in last 7 days">
          <TableCard id="email" title="Recent email failures" variant="warning">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-700">To</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Subject</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEmailFailures.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-slate-900">{r.toEmail}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{r.subject}</td>
                      <td className="px-4 py-3 text-slate-600">{r.statusCode ?? r.status}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCard>
        </AdminSection>
      )}

      <AdminSection title="Reference" subtitle="How recovery works">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <ul className="list-disc space-y-1 pl-4">
            <li>
              <strong>Enqueue recovery</strong>: Cron every 5 min retries <code className="rounded bg-slate-200 px-1">inngest.send()</code> for
              events with <code className="rounded bg-slate-200 px-1">enqueuedAt = null</code>.
            </li>
            <li>
              <strong>Delivery retry</strong>: Cron retries FAILED deliveries with <code className="rounded bg-slate-200 px-1">nextRetryAt &lt;= now</code> and
              <code className="rounded bg-slate-200 px-1 ml-1">attemptCount &lt; 5</code>.
            </li>
            <li>
              <strong>Exhausted</strong>: <code className="rounded bg-slate-200 px-1">attemptCount &gt;= 5</code> — no automatic retry.
            </li>
          </ul>
        </div>
      </AdminSection>
    </div>
  );
}
