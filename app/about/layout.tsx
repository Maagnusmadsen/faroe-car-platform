import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "RentLocal connects travellers with local car owners across the Faroe Islands. Learn about our mission and how peer-to-peer car rental works.",
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
