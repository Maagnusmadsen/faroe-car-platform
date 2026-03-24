import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/context/LanguageContext";
import Providers from "@/components/Providers";
import WelcomeAfterSignupBanner from "@/components/WelcomeAfterSignupBanner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RentLocal",
    template: "%s | RentLocal",
  },
  description:
    "RentLocal connects travellers with local car owners across the Faroe Islands. Rent or list your car on a clean, modern peer-to-peer car sharing platform.",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "RentLocal",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("rentlocal-theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var useDark=t==="dark"||(t!=="light"&&d);document.documentElement.classList.toggle("dark",!!useDark);})();`,
          }}
        />
        <Providers>
          <LanguageProvider>
            <Suspense fallback={null}>
              <WelcomeAfterSignupBanner />
            </Suspense>
            {children}
          </LanguageProvider>
        </Providers>
      </body>
    </html>
  );
}
