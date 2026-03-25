"use client";

import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <main className="relative min-h-screen">
      {/* Full-screen hero background — CSS background for reliable display */}
      <div
        className="fixed inset-0 z-0 bg-slate-900 bg-cover bg-center hero-bg-zoom"
        style={{ backgroundImage: "url('/hero-faroe.jpg')" }}
        aria-hidden
      >
        {/* Slightly stronger overlay for WCAG-friendly readability on the hero */}
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.42)" }} aria-hidden />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent"
          aria-hidden
        />
      </div>

      <div className="relative z-10">
        <Navbar variant="transparent" />

      {/* Centered hero content: headline → subtitle → buttons → trust */}
      <section className="flex min-h-[85dvh] min-h-screen flex-col items-center justify-center px-4 pb-16 pt-20 text-center sm:min-h-[100dvh] sm:pb-20 sm:pt-24 sm:px-6 lg:pt-28 lg:px-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-white drop-shadow-lg max-sm:text-balance sm:text-5xl lg:text-6xl">
            {t("home.headline")}
          </h1>
          <p className="mt-3 text-base text-white drop-shadow-md max-sm:text-balance sm:mt-6 sm:text-xl lg:text-2xl">
            {t("home.subheadline")}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:gap-4">
            <Link
              href="/rent-a-car"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-brand px-6 py-4 text-base font-semibold text-white shadow-lg shadow-slate-900/20 transition-colors hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent max-sm:w-full sm:px-8 sm:text-lg"
            >
              {t("nav.rentACar")}
            </Link>
            <Link
              href="/list-your-car"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border-2 border-white/90 bg-white/5 px-6 py-4 text-base font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10 hover:border-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent max-sm:w-full sm:px-8 sm:text-lg"
            >
              {t("nav.listYourCar")}
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-white/90 drop-shadow-sm max-sm:max-w-[280px] sm:mt-10 sm:gap-x-8 sm:gap-y-1">
            <li className="flex items-center gap-1.5">
              <span className="h-1 w-1 shrink-0 rounded-full bg-brand" />
              {t("home.trustLocal")}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-1 w-1 shrink-0 rounded-full bg-brand" />
              {t("home.trustAirport")}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-1 w-1 shrink-0 rounded-full bg-brand" />
              {t("home.trustInsurance")}
            </li>
          </ul>
        </div>
      </section>

      {/* Concept section — two-column on desktop, stacked on mobile */}
      <section className="bg-slate-100 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: title + body text */}
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 max-sm:text-balance sm:text-3xl lg:text-4xl">
                {t("home.conceptTitle")}
              </h2>
              <p className="mt-4 text-base leading-[1.7] text-slate-600 sm:mt-6 sm:text-lg">
                {t("home.conceptP1")}
              </p>
              <p className="mt-4 text-base leading-[1.7] text-slate-600 sm:mt-5 sm:text-lg">
                {t("home.conceptP2")}
              </p>
            </div>

            {/* Right: supporting image */}
            <div className="relative overflow-hidden rounded-2xl shadow-xl lg:order-none">
              <div className="aspect-[4/3] w-full">
                <Image
                  src="/hero-faroe.jpg"
                  alt="Scenic road and landscape in the Faroe Islands"
                  width={800}
                  height={600}
                  className="h-full w-full object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>

          {/* Highlight cards */}
          <div className="mt-12 grid grid-cols-1 gap-4 sm:mt-20 sm:grid-cols-3 sm:gap-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand" aria-hidden>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {t("home.conceptLocalTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("home.conceptLocalText")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand" aria-hidden>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 12H5" />
                </svg>
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {t("home.conceptAirportTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("home.conceptAirportText")}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand" aria-hidden>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {t("home.conceptPricesTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {t("home.conceptPricesText")}
              </p>
            </div>
          </div>
        </div>
      </section>

        <Footer />
      </div>
    </main>
  );
}
