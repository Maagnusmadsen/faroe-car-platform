import type { Metadata } from "next";
import OwnerLayoutClient from "@/components/owner/OwnerLayoutClient";

export const metadata: Metadata = {
  title: "Your Earnings | RentLocal",
  description: "Manage your car listings and see your earnings on RentLocal.",
};

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OwnerLayoutClient>{children}</OwnerLayoutClient>;
}
