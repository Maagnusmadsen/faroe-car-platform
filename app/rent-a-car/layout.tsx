import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rent a Car",
  description:
    "Browse and rent cars from local owners in the Faroe Islands. Find the perfect car for your trip with flexible pickup options.",
};

export default function RentACarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
