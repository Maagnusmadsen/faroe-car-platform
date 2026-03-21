"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";

export default function SignupPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConfirmEmail(false);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || undefined,
          },
          emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=/`,
        },
      });
      if (signUpError) {
        if (signUpError.message.includes("already registered") || signUpError.message.includes("already exists")) {
          setError(t("auth.errorEmailInUse"));
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }
      if (data.user && !data.session) {
        setConfirmEmail(true);
        setLoading(false);
        return;
      }
      if (data.session) {
        router.push("/login?registered=1");
        return;
      }
      router.push("/login?registered=1");
    } catch {
      setError(t("auth.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <section className="mx-auto flex max-w-md flex-col justify-center px-4 py-12 sm:py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">{t("auth.signupTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("auth.noAccount")}{" "}
            <Link href="/login" className="font-medium text-brand hover:underline">
              {t("nav.login")}
            </Link>
          </p>
          {confirmEmail && (
            <div className="mt-2 space-y-2 rounded-lg bg-brand-light px-3 py-3 text-sm text-brand" role="status">
              <p>{t("auth.confirmEmail") || "Check your email to confirm your account, then log in."}</p>
              <p className="text-brand-hover">
                Fik du ingen mail? (fx på localhost) Prøv at{" "}
                <Link href="/login" className="font-medium underline">
                  logge ind
                </Link>{" "}
                med din adgangskode – kontoen er ofte allerede aktiv.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="signup-firstName" className="block text-sm font-medium text-slate-700">
                  {t("auth.firstName")}
                </label>
                <input
                  id="signup-firstName"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  required
                />
              </div>
              <div>
                <label htmlFor="signup-lastName" className="block text-sm font-medium text-slate-700">
                  {t("auth.lastName")}
                </label>
                <input
                  id="signup-lastName"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700">
                {t("auth.email")}
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                required
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700">
                {t("auth.password")}
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                required
                minLength={8}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[48px] w-full items-center justify-center rounded-lg bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "…" : t("auth.signupButton")}
            </button>
          </form>
        </div>
      </section>
      <Footer />
    </main>
  );
}
