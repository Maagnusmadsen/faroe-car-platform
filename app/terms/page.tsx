"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";

export default function TermsPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("terms.title")}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {t("terms.lastUpdated")}
        </p>

        <div className="mt-10 space-y-10 text-slate-700">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("terms.termsHeading")}
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed">
              <p>{t("terms.termsIntro")}</p>
              <p>{t("terms.termsEligibility")}</p>
              <p>{t("terms.termsBookings")}</p>
              <p>{t("terms.termsInsurance")}</p>
              <p>
                {t("terms.termsCancellation")}{" "}
                <Link href="/cancellation" className="font-medium text-brand hover:underline">
                  Cancellation policy
                </Link>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("terms.privacyHeading")}
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed">
              <p>{t("terms.privacyIntro")}</p>
              <p>{t("terms.privacyData")}</p>
              <p>{t("terms.privacyUse")}</p>
              <p>{t("terms.privacyContact")}</p>
            </div>
          </section>
        </div>

        <p className="mt-12 text-center text-sm text-slate-500">
          <Link href="/contact" className="text-brand hover:underline">
            {t("footer.contact")}
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
