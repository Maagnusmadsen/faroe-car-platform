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
        {/* Mobile: centered, stacked */}
        <div className="flex flex-col items-center md:hidden">
          <nav className="flex w-full max-w-[200px] flex-col gap-0">
            <Link
              href="/about"
              className="flex min-h-[44px] items-center justify-center border-b border-white/10 text-sm font-medium text-white transition-colors hover:text-brand"
            >
              {t("footer.about")}
            </Link>
            <Link
              href="/how-it-works"
              className="flex min-h-[44px] items-center justify-center border-b border-white/10 text-sm font-medium text-white transition-colors hover:text-brand"
            >
              {t("footer.howItWorks")}
            </Link>
            <Link
              href="/faq"
              className="flex min-h-[44px] items-center justify-center border-b border-white/10 text-sm font-medium text-white transition-colors hover:text-brand"
            >
              {t("footer.faq")}
            </Link>
            <Link
              href="/contact"
              className="flex min-h-[44px] items-center justify-center border-b border-white/10 text-sm font-medium text-white transition-colors hover:text-brand"
            >
              {t("footer.contact")}
            </Link>
            <Link
              href="/cancellation"
              className="flex min-h-[44px] items-center justify-center border-b border-white/10 text-sm font-medium text-white transition-colors hover:text-brand"
            >
              {t("footer.cancellation")}
            </Link>
            <Link
              href="/terms"
              className="flex min-h-[44px] items-center justify-center border-b border-white/10 text-sm font-medium text-white transition-colors hover:text-brand"
            >
              {t("footer.termsPrivacy")}
            </Link>
          </nav>
          <div className="mt-8 flex flex-col items-center gap-4 border-t border-white/20 pt-8">
            <Logo href="/" responsive="footer" variant="light" />
            <p
              className="text-center text-xs leading-relaxed"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              © {new Date().getFullYear()} RentLocal. {t("footer.copyright")}
            </p>
          </div>
        </div>

        {/* Desktop: logo left, links right, copyright bottom */}
        <div className="hidden md:block">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <Logo href="/" responsive="footer" variant="light" />
            <nav className="flex flex-wrap items-center gap-x-8 gap-y-2">
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
          </div>
          <p
            className="mt-10 border-t border-white/20 pt-8 text-center text-sm"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            © {new Date().getFullYear()} RentLocal. {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
