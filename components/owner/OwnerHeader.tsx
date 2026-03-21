"use client";

import Link from "next/link";

export default function OwnerHeader() {
  return (
    <header className="fixed left-64 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-slate-900">Your Earnings</h1>
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to site
        </Link>
      </div>
    </header>
  );
}
