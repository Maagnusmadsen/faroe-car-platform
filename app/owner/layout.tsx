import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Owner Dashboard",
  description: "Manage your car listings and rental requests on RentLocal.",
};

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
