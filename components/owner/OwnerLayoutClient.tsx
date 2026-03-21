"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import OwnerSidebar from "./OwnerSidebar";
import OwnerHeader from "./OwnerHeader";

export default function OwnerLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/owner/dashboard");
      return;
    }
  }, [status, router]);

  if (status === "loading" || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <OwnerSidebar />
      <OwnerHeader />
      <main className="pl-64 pt-16">
        <div className="min-h-[calc(100vh-4rem)] p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
