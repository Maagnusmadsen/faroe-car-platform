"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Redirect to combined Bookings & listings page with My listings tab.
 * Preserves stripe=success and published=1 for return URLs.
 */
function MyListingsRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("tab", "listings");
    const stripe = searchParams.get("stripe");
    const published = searchParams.get("published");
    if (stripe) params.set("stripe", stripe);
    if (published) params.set("published", published);
    router.replace(`/bookings?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-slate-500">Redirecting…</p>
    </div>
  );
}

export default function MyListingsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-slate-500">Loading…</p></div>}>
      <MyListingsRedirect />
    </Suspense>
  );
}
