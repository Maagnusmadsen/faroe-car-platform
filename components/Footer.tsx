"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              F
            </div>
            <span className="text-lg font-semibold text-slate-900">
              FaroeRent
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link
              href="/about"
              className="text-slate-600 transition-colors hover:text-slate-900"
            >
              {t("footer.about")}
            </Link>
            <Link
              href="/how-it-works"
              className="text-slate-600 transition-colors hover:text-slate-900"
            >
              {t("footer.howItWorks")}
            </Link>
            <Link
              href="/faq"
              className="text-slate-600 transition-colors hover:text-slate-900"
            >
              {t("footer.faq")}
            </Link>
            <Link
              href="/contact"
              className="text-slate-600 transition-colors hover:text-slate-900"
            >
              {t("footer.contact")}
            </Link>
            <Link
              href="/cancellation"
              className="text-slate-600 transition-colors hover:text-slate-900"
            >
              {t("footer.cancellation")}
            </Link>
            <Link
              href="/terms"
              className="text-slate-600 transition-colors hover:text-slate-900"
            >
              {t("footer.termsPrivacy")}
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} FaroeRent. {t("footer.copyright")}
        </p>
      </div>
    </footer>
  );
}
