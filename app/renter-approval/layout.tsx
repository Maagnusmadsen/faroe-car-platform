import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Approve Renter",
  description: "Review and approve rental requests on RentLocal.",
};

export default function RenterApprovalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
