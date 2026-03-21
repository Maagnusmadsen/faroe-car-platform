import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: "RentLocal cancellation policy for car rentals in the Faroe Islands.",
};

export default function CancellationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
