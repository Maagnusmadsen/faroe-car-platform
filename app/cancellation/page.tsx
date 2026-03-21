"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";

export default function CancellationPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("cancellation.title")}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("cancellation.lastUpdated")}
        </p>
        <p className="mt-4 text-slate-600">
          {t("cancellation.intro")}
        </p>

        <div className="mt-10 space-y-8 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("cancellation.renterHeading")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed">
              {t("cancellation.renterP1")}
            </p>
            <p className="mt-3 text-sm leading-relaxed">
              {t("cancellation.renterP2")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("cancellation.refundHeading")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed">
              {t("cancellation.refundP1")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("cancellation.ownerHeading")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed">
              {t("cancellation.ownerP1")}
            </p>
          </section>

          <p className="text-sm text-slate-600">
            {t("cancellation.contactNote")}
          </p>
        </div>

        <p className="mt-12 text-center text-sm text-slate-500">
          <Link href="/contact" className="text-brand hover:underline">
            {t("footer.contact")}
          </Link>
          {" · "}
          <Link href="/terms" className="text-brand hover:underline">
            {t("footer.termsPrivacy")}
          </Link>
          {" · "}
          <Link href="/" className="text-brand hover:underline">
            {t("contact.backToHome")}
          </Link>
        </p>
      </div>
      <Footer />
    </main>
  );
}
