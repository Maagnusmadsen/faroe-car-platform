"use client";

import { Suspense, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";
import ListingWizard from "@/components/listing-wizard/ListingWizard";

export default function ListYourCarPage() {
  const { t } = useLanguage();
  const wizardRef = useRef<HTMLDivElement>(null);

  const scrollToWizard = () => {
    wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero */}
      <section
        className="relative flex min-h-[75vh] w-full flex-col items-center justify-center px-4 py-24 text-center sm:px-6 lg:px-8"
        style={{
          backgroundImage: "url('/hero-2-faroe.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-md sm:text-5xl">
            {t("list.heroTitle")}
          </h1>
          <p className="mt-6 text-lg text-white/95 drop-shadow-sm sm:text-xl">
            {t("list.heroSubtitle")}
          </p>
          <button
            type="button"
            onClick={scrollToWizard}
            className="mt-10 rounded-xl bg-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent"
          >
            {t("list.heroCta")}
          </button>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-200 bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t("list.howTitle")}
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-center shadow-sm">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                1
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {t("list.howStep1Title")}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{t("list.howStep1Text")}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-center shadow-sm">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                2
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {t("list.howStep2Title")}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{t("list.howStep2Text")}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 text-center shadow-sm">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                3
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {t("list.howStep3Title")}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{t("list.howStep3Text")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t("list.testimonialsTitle")}
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-slate-700 italic">&ldquo;{t("list.testimonial1Quote")}&rdquo;</p>
              <p className="mt-4 text-sm font-medium text-slate-900">— {t("list.testimonial1Name")}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-slate-700 italic">&ldquo;{t("list.testimonial2Quote")}&rdquo;</p>
              <p className="mt-4 text-sm font-medium text-slate-900">— {t("list.testimonial2Name")}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-slate-700 italic">&ldquo;{t("list.testimonial3Quote")}&rdquo;</p>
              <p className="mt-4 text-sm font-medium text-slate-900">— {t("list.testimonial3Name")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Listing wizard */}
      <section
        id="listing-form"
        ref={wizardRef}
        className="border-t border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {t("list.title")}
          </h2>
          <p className="mt-2 text-slate-600">{t("list.description")}</p>
          <div className="mt-8">
            <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading…</div>}>
              <ListingWizard />
            </Suspense>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
