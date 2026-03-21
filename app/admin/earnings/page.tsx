"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect /admin/earnings → /admin/payments (renamed for clarity)
 */
export default function AdminEarningsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/payments");
  }, [router]);
  return (
    <div className="flex items-center justify-center py-24">
      <p className="text-slate-500">Redirecting…</p>
    </div>
  );
}
