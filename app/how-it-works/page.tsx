"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";

export default function HowItWorksPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("howItWorks.title")}
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          {t("howItWorks.intro")}
        </p>

        <section className="mt-12">
          <h2 className="text-xl font-semibold text-slate-900">
            {t("howItWorks.rentingHeading")}
          </h2>
          <ol className="mt-6 space-y-6">
            <li className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-lg font-bold text-brand">
                1
              </span>
              <div>
                <h3 className="font-medium text-slate-900">{t("howItWorks.rentStep1Title")}</h3>
                <p className="mt-1 text-sm text-slate-600">{t("howItWorks.rentStep1Text")}</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-lg font-bold text-brand">
                2
              </span>
              <div>
                <h3 className="font-medium text-slate-900">{t("howItWorks.rentStep2Title")}</h3>
                <p className="mt-1 text-sm text-slate-600">{t("howItWorks.rentStep2Text")}</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-lg font-bold text-brand">
                3
              </span>
              <div>
                <h3 className="font-medium text-slate-900">{t("howItWorks.rentStep3Title")}</h3>
                <p className="mt-1 text-sm text-slate-600">{t("howItWorks.rentStep3Text")}</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-lg font-bold text-brand">
                4
              </span>
              <div>
                <h3 className="font-medium text-slate-900">{t("howItWorks.rentStep4Title")}</h3>
                <p className="mt-1 text-sm text-slate-600">{t("howItWorks.rentStep4Text")}</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold text-slate-900">
            {t("howItWorks.listingHeading")}
          </h2>
          <ol className="mt-6 space-y-6">
            <li className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-lg font-bold text-brand">
                1
              </span>
              <div>
                <h3 className="font-medium text-slate-900">{t("howItWorks.listStep1Title")}</h3>
                <p className="mt-1 text-sm text-slate-600">{t("howItWorks.listStep1Text")}</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-lg font-bold text-brand">
                2
              </span>
              <div>
                <h3 className="font-medium text-slate-900">{t("howItWorks.listStep2Title")}</h3>
                <p className="mt-1 text-sm text-slate-600">{t("howItWorks.listStep2Text")}</p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light text-lg font-bold text-brand">
                3
              </span>
              <div>
                <h3 className="font-medium text-slate-900">{t("howItWorks.listStep3Title")}</h3>
                <p className="mt-1 text-sm text-slate-600">{t("howItWorks.listStep3Text")}</p>
              </div>
            </li>
          </ol>
        </section>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            href="/rent-a-car"
            className="rounded-xl bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-hover"
          >
            {t("nav.rentACar")}
          </Link>
          <Link
            href="/list-your-car"
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("nav.listYourCar")}
          </Link>
        </div>

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
