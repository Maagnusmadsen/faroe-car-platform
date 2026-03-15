"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";

export default function ContactPage() {
  const { t } = useLanguage();
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("contact.title")}
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          {t("contact.intro")}
        </p>

        <section className="mt-12 space-y-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              {t("contact.emailHeading")}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {t("contact.emailDescription")}
            </p>
            {supportEmail ? (
              <a
                href={`mailto:${supportEmail}`}
                className="mt-4 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-emerald-500"
              >
                {supportEmail}
              </a>
            ) : (
              <p className="mt-4 text-sm text-amber-700">
                {t("contact.emailNotConfigured")}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              {t("contact.phoneHeading")}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {t("contact.phoneDescription")}
            </p>
            {supportPhone ? (
              <a
                href={`tel:${supportPhone.replace(/\s/g, "")}`}
                className="mt-4 inline-block rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                {supportPhone}
              </a>
            ) : (
              <p className="mt-4 text-sm text-amber-700">
                {t("contact.phoneNotConfigured")}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              {t("contact.hoursHeading")}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {t("contact.hoursDescription")}
            </p>
            <p className="mt-3 font-medium text-slate-800">
              {t("contact.hoursText")}
            </p>
          </div>
        </section>

        <p className="mt-12 text-center text-sm text-slate-500">
          <Link href="/" className="text-emerald-600 hover:underline">
            {t("contact.backToHome")}
          </Link>
        </p>
      </div>
      <Footer />
    </main>
  );
}
