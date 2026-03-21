"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { Logo } from "@/components/Logo";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="relative overflow-hidden">
      {/* Background image + dark overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/hero-faroe.jpg')" }}
        aria-hidden
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.75))",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-[60px] lg:px-8">
        {/* Section 1: Navigation links */}
        <nav className="flex flex-col items-center gap-0 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-4 sm:pb-10">
          <Link
            href="/about"
            className="flex min-h-[44px] w-full max-w-[200px] items-center justify-center text-sm font-medium text-white transition-colors hover:text-brand max-sm:border-b max-sm:border-white/10 sm:max-w-none sm:border-0"
          >
            {t("footer.about")}
          </Link>
          <Link
            href="/how-it-works"
            className="flex min-h-[44px] w-full max-w-[200px] items-center justify-center text-sm font-medium text-white transition-colors hover:text-brand max-sm:border-b max-sm:border-white/10 sm:max-w-none sm:border-0"
          >
            {t("footer.howItWorks")}
          </Link>
          <Link
            href="/faq"
            className="flex min-h-[44px] w-full max-w-[200px] items-center justify-center text-sm font-medium text-white transition-colors hover:text-brand max-sm:border-b max-sm:border-white/10 sm:max-w-none sm:border-0"
          >
            {t("footer.faq")}
          </Link>
          <Link
            href="/contact"
            className="flex min-h-[44px] w-full max-w-[200px] items-center justify-center text-sm font-medium text-white transition-colors hover:text-brand max-sm:border-b max-sm:border-white/10 sm:max-w-none sm:border-0"
          >
            {t("footer.contact")}
          </Link>
          <Link
            href="/cancellation"
            className="flex min-h-[44px] w-full max-w-[200px] items-center justify-center text-sm font-medium text-white transition-colors hover:text-brand max-sm:border-b max-sm:border-white/10 sm:max-w-none sm:border-0"
          >
            {t("footer.cancellation")}
          </Link>
          <Link
            href="/terms"
            className="flex min-h-[44px] w-full max-w-[200px] items-center justify-center text-sm font-medium text-white transition-colors hover:text-brand max-sm:border-b max-sm:border-white/10 sm:max-w-none sm:border-0"
          >
            {t("footer.termsPrivacy")}
          </Link>
        </nav>

        {/* Section 2: Logo + copyright */}
        <div className="flex flex-col items-center gap-4 border-t border-white/20 pt-8 sm:gap-6 sm:pt-10">
          <Logo href="/" responsive="footer" variant="light" />
          <p
            className="text-center text-xs leading-relaxed sm:text-sm"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            © {new Date().getFullYear()} RentLocal. {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
