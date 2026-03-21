import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  description: "RentLocal admin dashboard.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
