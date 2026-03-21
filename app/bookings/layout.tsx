import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Bookings",
  description: "View and manage your car rental bookings on RentLocal.",
};

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
