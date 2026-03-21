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

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-[60px] sm:px-6 lg:px-8">
        {/* Section 1: Navigation links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 pb-10">
          <Link
            href="/about"
            className="text-sm font-medium text-white transition-colors hover:text-brand"
          >
            {t("footer.about")}
          </Link>
          <Link
            href="/how-it-works"
            className="text-sm font-medium text-white transition-colors hover:text-brand"
          >
            {t("footer.howItWorks")}
          </Link>
          <Link
            href="/faq"
            className="text-sm font-medium text-white transition-colors hover:text-brand"
          >
            {t("footer.faq")}
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-white transition-colors hover:text-brand"
          >
            {t("footer.contact")}
          </Link>
          <Link
            href="/cancellation"
            className="text-sm font-medium text-white transition-colors hover:text-brand"
          >
            {t("footer.cancellation")}
          </Link>
          <Link
            href="/terms"
            className="text-sm font-medium text-white transition-colors hover:text-brand"
          >
            {t("footer.termsPrivacy")}
          </Link>
        </nav>

        {/* Section 2: Logo + copyright */}
        <div className="flex flex-col items-center gap-6 border-t border-white/20 pt-10">
          <Logo href="/" responsive="footer" variant="light" />
          <p
            className="text-center text-sm"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            © {new Date().getFullYear()} RentLocal. {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
