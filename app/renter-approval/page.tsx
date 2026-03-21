"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";

type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED";

const MAX_FILE_MB = 5;
const ACCEPT = "image/jpeg,image/png,image/webp";

export default function RenterApprovalPage() {
  const { t } = useLanguage();
  const { user, status: authStatus } = useAuth();
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/login?callbackUrl=/renter-approval");
      return;
    }
    if (authStatus !== "authenticated" || !user) return;
    let cancelled = false;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        setVerificationStatus((json?.data?.verificationStatus as VerificationStatus) ?? null);
      })
      .catch(() => {
        if (!cancelled) setVerificationStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus, user, router]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setLicenseFile(null);
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`File too large. Max ${MAX_FILE_MB}MB.`);
      setLicenseFile(null);
      return;
    }
    const type = file.type?.toLowerCase();
    if (!type || !["image/jpeg", "image/png", "image/webp"].includes(type)) {
      setFileError("Use JPEG, PNG or WebP.");
      setLicenseFile(null);
      return;
    }
    setLicenseFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!dateOfBirth.trim()) {
      setMessage({ type: "error", text: "Please enter your date of birth." });
      return;
    }
    if (!licenseFile) {
      setMessage({ type: "error", text: "Please upload a photo of your driving licence." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    setFileError(null);
    try {
      const formData = new FormData();
      formData.set("dateOfBirth", dateOfBirth.trim());
      if (licenseNumber.trim()) formData.set("driverLicenseNumber", licenseNumber.trim());
      formData.set("file", licenseFile);
      const res = await fetch("/api/renter-approval", {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setVerificationStatus(json?.data?.verificationStatus ?? "PENDING");
        setMessage({
          type: "success",
          text: json?.data?.message ?? t("renterApproval.requestSuccess"),
        });
      } else {
        const errMsg =
          json?.error === "You must be at least 18 years old to rent a car."
            ? t("renterApproval.under18")
            : json?.error ?? "Something went wrong.";
        setMessage({ type: "error", text: errMsg });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong." });
    } finally {
      setSubmitting(false);
    }
  }

  if (authStatus === "loading" || (authStatus === "authenticated" && verificationStatus === null && !message)) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-slate-500">Loading…</p>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("renterApproval.title")}
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          {t("renterApproval.intro")}
        </p>
        <p className="mt-2 text-slate-600">
          {t("renterApproval.forTourists")}
        </p>

        {verificationStatus === "VERIFIED" ? (
          <div className="mt-10 rounded-2xl border border-brand/30 bg-brand-light p-6">
            <p className="font-medium text-slate-800">{t("renterApproval.alreadyApproved")}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/rent-a-car"
                className="rounded-xl bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-hover"
              >
                {t("renterApproval.backToCars")}
              </Link>
              <Link
                href="/profile"
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                {t("renterApproval.backToProfile")}
              </Link>
            </div>
          </div>
        ) : verificationStatus === "PENDING" ? (
          <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="font-medium text-amber-800">{t("renterApproval.requestSuccess")}</p>
            <p className="mt-2 text-sm text-amber-700">
              {t("renterApproval.afterSubmitHint")}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/rent-a-car" className="text-sm font-medium text-brand hover:underline">
                {t("renterApproval.backToCars")}
              </Link>
              <Link href="/profile" className="text-sm font-medium text-brand hover:underline">
                {t("renterApproval.backToProfile")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                {t("renterApproval.howTitle")}
              </h2>
              <p className="mt-2 text-slate-600">
                {t("renterApproval.howText")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-slate-700">
                  {t("renterApproval.labelDateOfBirth")} <span className="text-red-500">*</span>
                </label>
                <p className="mt-0.5 text-xs text-slate-500">{t("renterApproval.labelDateOfBirthHint")}</p>
                <input
                  id="dob"
                  type="date"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-slate-700">
                  {t("renterApproval.labelLicenseNumber")}
                </label>
                <input
                  id="licenseNumber"
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. 12345678"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label htmlFor="licensePhoto" className="block text-sm font-medium text-slate-700">
                  {t("renterApproval.labelLicensePhoto")} <span className="text-red-500">*</span>
                </label>
                <p className="mt-0.5 text-xs text-slate-500">{t("renterApproval.labelLicensePhotoHint")}</p>
                <input
                  id="licensePhoto"
                  type="file"
                  accept={ACCEPT}
                  required
                  onChange={onFileChange}
                  className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-light file:px-4 file:py-2 file:font-medium file:text-brand hover:file:bg-brand-light"
                />
                {licenseFile && (
                  <p className="mt-1 text-xs text-slate-500">
                    Selected: {licenseFile.name} ({(licenseFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
                {fileError && <p className="mt-1 text-sm text-red-600">{fileError}</p>}
              </div>

              {message && (
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${
                    message.type === "success"
                      ? "border border-brand/30 bg-brand-light text-slate-800"
                      : "border border-red-200 bg-red-50 text-red-800"
                  }`}
                  role="alert"
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-brand px-6 py-3 font-medium text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? t("renterApproval.requestPending") : t("renterApproval.requestButton")}
              </button>
            </form>
          </>
        )}

        <p className="mt-12 text-center text-sm text-slate-500">
          <Link href="/profile" className="text-brand hover:underline">
            {t("renterApproval.backToProfile")}
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
