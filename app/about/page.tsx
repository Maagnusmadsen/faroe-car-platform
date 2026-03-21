"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("about.title")}
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          {t("about.intro")}
        </p>

        <section className="mt-10 space-y-6 text-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("about.missionHeading")}
            </h2>
            <p className="mt-2 leading-relaxed">
              {t("about.missionText")}
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("about.whatWeDoHeading")}
            </h2>
            <p className="mt-2 leading-relaxed">
              {t("about.whatWeDoText")}
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("about.whyHeading")}
            </h2>
            <p className="mt-2 leading-relaxed">
              {t("about.whyText")}
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {t("about.insuranceSectionTitle")}
            </h2>
            <p className="mt-2 leading-relaxed">
              {t("about.insuranceSectionText")}
            </p>
          </div>
        </section>

        <p className="mt-12 text-center text-sm text-slate-500">
          <Link href="/" className="text-brand hover:underline">
            {t("contact.backToHome")}
          </Link>
        </p>
      </div>
      <Footer />
    </main>
  );
}
