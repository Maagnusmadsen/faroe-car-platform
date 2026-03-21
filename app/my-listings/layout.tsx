import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Listings",
  description: "Manage your car listings on RentLocal.",
};

export default function MyListingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
