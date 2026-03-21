import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "RentLocal terms of service and user agreement.",
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
