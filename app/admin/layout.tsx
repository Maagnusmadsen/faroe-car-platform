import type { Metadata } from "next";
import AdminLayoutClient from "@/components/admin/AdminLayout";

export const metadata: Metadata = {
  title: "Admin | RentLocal",
  description: "RentLocal admin dashboard.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
