"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import StatusBadge from "@/components/admin/StatusBadge";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  verificationStatus: string;
  licenseImageUrl: string | null;
  listingCount: number;
  bookingCount: number;
};

type UsersResponse = {
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  pendingApprovals?: number;
};

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const filter = searchParams.get("filter") ?? "all";
  const roleFilter = searchParams.get("role") ?? "all";

  const fetchUsers = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search) params.set("search", search);
      if (filter !== "all") params.set("filter", filter);
      if (roleFilter !== "all") params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to load users");
      const json = await res.json();
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page, search, filter, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function approveRenter(userId: string) {
    setApprovingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: "VERIFIED" }),
      });
      if (res.ok) fetchUsers();
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-500">All platform users</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(["all", "pending", "verified"] as const).map((f) => (
              <Link
                key={f}
                href={`/admin/users?filter=${f}${roleFilter !== "all" ? `&role=${roleFilter}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f === "all" ? "All" : f === "pending" ? "Pending approval" : "Verified"}
              </Link>
            ))}
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(["all", "USER", "ADMIN"] as const).map((r) => (
              <Link
                key={r}
                href={`/admin/users?role=${r}${filter !== "all" ? `&filter=${filter}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  roleFilter === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r}
              </Link>
            ))}
          </div>
          <input
            type="search"
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <button
            type="button"
            onClick={fetchUsers}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover"
          >
            Search
          </button>
        </div>
      </div>

      {data && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <span className="text-sm text-slate-600">
              Total users: <strong className="text-slate-900">{data.total}</strong>
            </span>
            {data.pendingApprovals != null && data.pendingApprovals > 0 && (
              <Link
                href="/admin/users?filter=pending"
                className="text-sm font-medium text-amber-700 hover:underline"
              >
                {data.pendingApprovals} pending approval{data.pendingApprovals !== 1 ? "s" : ""}
              </Link>
            )}
          </div>
          {filter === "pending" && (
            <span className="text-sm text-amber-700">Showing pending approvals only</span>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-slate-500">Loading…</p>
      ) : data ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-700">User</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Role</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Renter status</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Listings</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Bookings</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Joined</th>
                  <th className="px-4 py-3 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{u.email}</p>
                        {u.name && <p className="text-slate-500">{u.name}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.verificationStatus} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.listingCount}</td>
                    <td className="px-4 py-3 text-slate-600">{u.bookingCount}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {u.verificationStatus === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => approveRenter(u.id)}
                          disabled={approvingId === u.id}
                          className="rounded bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                        >
                          {approvingId === u.id ? "…" : "Approve"}
                        </button>
                      )}
                      {u.licenseImageUrl && (
                        <a
                          href={u.licenseImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-xs text-slate-500 hover:underline"
                        >
                          License
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.items.length === 0 && (
            <p className="py-8 text-center text-slate-500">No users found</p>
          )}

          {data.total > data.pageSize && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <Link
                  href={page > 1 ? `/admin/users?page=${page - 1}` : "#"}
                  className={`rounded border px-3 py-1 text-sm ${page <= 1 ? "cursor-not-allowed border-slate-100 text-slate-400" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                >
                  Previous
                </Link>
                <Link
                  href={data.hasMore ? `/admin/users?page=${page + 1}` : "#"}
                  className={`rounded border px-3 py-1 text-sm ${!data.hasMore ? "cursor-not-allowed border-slate-100 text-slate-400" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                >
                  Next
                </Link>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
