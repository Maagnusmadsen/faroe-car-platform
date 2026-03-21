import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how RentLocal works. Rent cars from locals or list your own. Simple, safe peer-to-peer car rental in the Faroe Islands.",
};

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
