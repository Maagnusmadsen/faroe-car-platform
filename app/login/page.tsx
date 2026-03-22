"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";

function LoginForm() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const registered = searchParams.get("registered") === "1";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) {
        setError(t("auth.errorInvalidCredentials"));
        setLoading(false);
        return;
      }
      if (data.session) {
        window.location.href = callbackUrl;
        return;
      }
      setError(t("auth.errorGeneric"));
    } catch {
      setError(t("auth.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <section className="mx-auto flex flex-1 max-w-md flex-col justify-center px-4 py-12 sm:py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">{t("auth.loginTitle")}</h1>
          {registered && (
            <p className="mt-2 rounded-lg bg-brand-light px-3 py-2 text-sm text-brand" role="status">
              {t("auth.signupSuccess")}
            </p>
          )}
          {errorParam === "auth_callback" && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
              {t("auth.errorGeneric") || "Something went wrong. Please try again."}
            </p>
          )}
          <p className="mt-1 text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-brand hover:underline">
              Sign up
            </Link>
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">
                {t("auth.email")}
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                {t("auth.password")}
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.passwordPlaceholder")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
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
              {loading ? "…" : t("auth.loginButton")}
            </button>
          </form>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col bg-slate-50">
          <Navbar />
          <section className="mx-auto flex flex-1 max-w-md flex-col justify-center px-4 py-16">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
            </div>
          </section>
          <Footer />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
