import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "List Your Car",
  description:
    "List your car on RentLocal and earn money when travellers rent it. Simple setup, insurance included, local car sharing in the Faroe Islands.",
};

export default function ListYourCarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
