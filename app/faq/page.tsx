"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";

export default function FAQPage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("home.faqTitle")}
        </h1>
        <p className="mt-2 text-slate-600">
          Quick answers about renting and listing cars on FaroeRent.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">General</h2>
          <dl className="mt-4 space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <dt className="text-sm font-semibold text-slate-900">
                  {t(`home.faqQ${i}`)}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {t(`home.faqA${i}`)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-slate-900">Renting a car</h2>
          <dl className="mt-4 space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <dt className="text-sm font-semibold text-slate-900">
                  {t(`rent.faqQ${i}`)}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {t(`rent.faqA${i}`)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4">
            <Link href="/rent-a-car" className="text-sm font-medium text-emerald-600 hover:underline">
              Rent a car →
            </Link>
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-slate-900">Listing your car</h2>
          <dl className="mt-4 space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <dt className="text-sm font-semibold text-slate-900">
                  {t(`list.faqQ${i}`)}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {t(`list.faqA${i}`)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4">
            <Link href="/list-your-car" className="text-sm font-medium text-emerald-600 hover:underline">
              List your car →
            </Link>
          </p>
        </section>

        <p className="mt-12 text-center text-sm text-slate-500">
          <Link href="/" className="text-emerald-600 hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
      <Footer />
    </main>
  );
}
