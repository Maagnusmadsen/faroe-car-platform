"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function AdminHeader() {
  const { signOut } = useAuth();

  return (
    <header className="fixed left-64 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-slate-900">Admin</h1>
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to site
        </Link>
      </div>
      <button
        type="button"
        onClick={() => signOut()}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Log out
      </button>
    </header>
  );
}
