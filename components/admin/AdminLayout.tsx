"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?callbackUrl=/admin");
      return;
    }
    if (status === "authenticated" && user?.role !== "ADMIN") {
      router.replace("/");
    }
  }, [status, user, router]);

  if (status === "loading" || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      <AdminHeader />
      <main className="pl-64 pt-16">
        <div className="min-h-[calc(100vh-4rem)] p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
