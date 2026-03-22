"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/context/LanguageContext";

type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED";

interface ProfileData {
  name: string | null;
  email: string;
  image: string | null;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  driverLicenseNumber: string | null;
  preferredLanguage: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  postalCode: string | null;
  ownerNote: string | null;
  renterNote: string | null;
  completionPercent: number;
  verificationStatus?: VerificationStatus;
}

const EMPTY_PROFILE: ProfileData = {
  name: null,
  email: "",
  image: null,
  phone: null,
  avatarUrl: null,
  bio: null,
  location: null,
  driverLicenseNumber: null,
  preferredLanguage: null,
  country: null,
  region: null,
  city: null,
  postalCode: null,
  ownerNote: null,
  renterNote: null,
  completionPercent: 0,
};

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user: sessionUser, status } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState<ProfileData>(EMPTY_PROFILE);

  useEffect(() => {
    if (status !== "authenticated" || !sessionUser) return;
    let cancelled = false;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load"))))
      .then((json) => {
        if (cancelled) return;
        const data = json.data as ProfileData;
        setProfile(data);
        setForm(data);
      })
      .catch(() => {
        if (!cancelled) setProfile(EMPTY_PROFILE);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, sessionUser]);

  function updateForm<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!sessionUser) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name ?? undefined,
          phone: form.phone ?? undefined,
          avatarUrl: form.avatarUrl ?? form.image ?? undefined,
          bio: form.bio ?? undefined,
          location: form.location ?? undefined,
          driverLicenseNumber: form.driverLicenseNumber ?? undefined,
          preferredLanguage: form.preferredLanguage ?? undefined,
          country: form.country ?? undefined,
          region: form.region ?? undefined,
          city: form.city ?? undefined,
          postalCode: form.postalCode ?? undefined,
          ownerNote: form.ownerNote ?? undefined,
          renterNote: form.renterNote ?? undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: json?.error ?? t("profile.saveError") });
        setSaving(false);
        return;
      }
      const data = json.data as ProfileData;
      setProfile(data);
      setForm(data);
      setEditing(false);
      setMessage({ type: "success", text: t("profile.saveSuccess") });
    } catch {
      setMessage({ type: "error", text: t("profile.saveError") });
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navbar />
        <section className="mx-auto max-w-lg px-4 py-16 text-center text-slate-500">…</section>
        <Footer />
      </main>
    );
  }

  if (!sessionUser) {
    return null;
  }

  const display = editing ? form : (profile ?? form);
  const isUnverified = profile && (profile.verificationStatus === "UNVERIFIED" || profile.verificationStatus === "PENDING");
  const isVerified = profile?.verificationStatus === "VERIFIED";

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />
      <section className="mx-auto max-w-lg px-4 py-10 sm:py-12">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{t("profile.title")}</h1>
                <p className="mt-1 text-sm text-slate-600">{t("profile.subtitle")}</p>
              </div>
              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t("profile.edit")}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setForm(profile ?? EMPTY_PROFILE);
                      setMessage(null);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {t("profile.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
                  >
                    {saving ? "…" : t("profile.save")}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-5 sm:px-8 sm:py-6">
            {message && (
              <div
                className={`mb-5 rounded-lg px-4 py-3 text-sm ${message.type === "success" ? "bg-brand-light text-slate-800" : "bg-red-50 text-red-800"}`}
                role="alert"
              >
                {message.text}
              </div>
            )}

            {/* Renter approval – prominent when not verified */}
            {isUnverified && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="text-sm font-semibold text-amber-900">{t("profile.verificationStatus")}</h2>
                <p className="mt-1 text-sm text-amber-800">
                  {profile!.verificationStatus === "PENDING"
                    ? t("profile.verificationPending")
                    : t("profile.verificationUnverified")}
                </p>
                <p className="mt-2 text-sm text-amber-700">{t("profile.getApprovedDescription")}</p>
                <Link
                  href="/renter-approval"
                  className="mt-4 inline-block rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
                >
                  {t("profile.getApprovedCta")}
                </Link>
              </div>
            )}

            {isVerified && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-light px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">✓</span>
                <span className="text-sm font-medium text-slate-800">{t("profile.verificationVerified")}</span>
              </div>
            )}

            {/* Profile completion – progress bar */}
            {profile && profile.completionPercent < 100 && (
              <div className="mb-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-700">{t("profile.completion")}</span>
                  <span className="text-sm text-slate-500">{profile.completionPercent}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${profile.completionPercent}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">{t("profile.completionHint")}</p>
              </div>
            )}

            {/* Main profile fields */}
            <div className="space-y-5">
              {/* Avatar + name row */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex-shrink-0">
                  {(display.avatarUrl ?? display.image) ? (
                    <img
                      src={display.avatarUrl ?? display.image ?? ""}
                      alt=""
                      className="h-20 w-20 rounded-full border-2 border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-slate-50 text-2xl text-slate-400">
                      —
                    </div>
                  )}
                  {editing && (
                    <input
                      type="url"
                      value={form.avatarUrl ?? form.image ?? ""}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        updateForm("avatarUrl", v);
                        updateForm("image", v);
                      }}
                      placeholder="https://..."
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500">{t("profile.fullName")}</label>
                    {editing ? (
                      <input
                        type="text"
                        value={form.name ?? ""}
                        onChange={(e) => updateForm("name", e.target.value || null)}
                        placeholder={t("profile.namePlaceholder")}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      />
                    ) : (
                      <p className="mt-1 text-slate-900">{display.name ?? "—"}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">{t("profile.email")}</label>
                    <p className="mt-1 text-slate-600">{display.email}</p>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-slate-700">{t("profile.bio")}</label>
              {editing ? (
                <textarea
                  value={form.bio ?? ""}
                  onChange={(e) => updateForm("bio", e.target.value || null)}
                  placeholder={t("profile.bioPlaceholder")}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-slate-900">{display.bio ?? "—"}</p>
              )}
            </div>
            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-slate-700">Location</label>
              {editing ? (
                <input
                  type="text"
                  value={form.location ?? ""}
                  onChange={(e) => updateForm("location", e.target.value || null)}
                  placeholder={t("profile.locationPlaceholder")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              ) : (
                <p className="mt-1 text-slate-900">{display.location ?? "—"}</p>
              )}
            </div>
            {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700">{t("profile.phone")} <span className="font-normal text-slate-400">(optional)</span></label>
              {editing ? (
                <input
                  type="tel"
                  value={form.phone ?? ""}
                  onChange={(e) => updateForm("phone", e.target.value || null)}
                  placeholder={t("profile.phonePlaceholder")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              ) : (
                <p className="mt-1 text-slate-900">{display.phone ?? "—"}</p>
              )}
            </div>

            {/* Additional details */}
              <details className="group mt-6 border-t border-slate-200 pt-5">
                <summary className="cursor-pointer text-sm font-medium text-slate-600 hover:text-slate-900">
                  {t("profile.additionalDetails")}
                </summary>
            <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">{t("profile.preferredLanguage")}</label>
              {editing ? (
                <select
                  value={form.preferredLanguage ?? ""}
                  onChange={(e) => updateForm("preferredLanguage", e.target.value || null)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                >
                  <option value="">—</option>
                  <option value="en">English</option>
                </select>
              ) : (
                <p className="mt-1 text-slate-900">{display.preferredLanguage ?? "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t("profile.driverLicense")}</label>
              {editing ? (
                <input
                  type="text"
                  value={form.driverLicenseNumber ?? ""}
                  onChange={(e) => updateForm("driverLicenseNumber", e.target.value || null)}
                  placeholder={t("profile.driverLicensePlaceholder")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              ) : (
                <p className="mt-1 text-slate-900">{display.driverLicenseNumber ?? "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t("profile.country")}</label>
              {editing ? (
                <input
                  type="text"
                  value={form.country ?? ""}
                  onChange={(e) => updateForm("country", e.target.value || null)}
                  placeholder={t("profile.countryPlaceholder")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              ) : (
                <p className="mt-1 text-slate-900">{display.country ?? "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t("profile.region")}</label>
              {editing ? (
                <input
                  type="text"
                  value={form.region ?? ""}
                  onChange={(e) => updateForm("region", e.target.value || null)}
                  placeholder={t("profile.regionPlaceholder")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              ) : (
                <p className="mt-1 text-slate-900">{display.region ?? "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t("profile.city")}</label>
              {editing ? (
                <input
                  type="text"
                  value={form.city ?? ""}
                  onChange={(e) => updateForm("city", e.target.value || null)}
                  placeholder={t("profile.cityPlaceholder")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              ) : (
                <p className="mt-1 text-slate-900">{display.city ?? "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t("profile.postalCode")}</label>
              {editing ? (
                <input
                  type="text"
                  value={form.postalCode ?? ""}
                  onChange={(e) => updateForm("postalCode", e.target.value || null)}
                  placeholder={t("profile.postalCodePlaceholder")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              ) : (
                <p className="mt-1 text-slate-900">{display.postalCode ?? "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t("profile.ownerNote")}</label>
              {editing ? (
                <textarea
                  value={form.ownerNote ?? ""}
                  onChange={(e) => updateForm("ownerNote", e.target.value || null)}
                  placeholder={t("profile.ownerNotePlaceholder")}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-slate-900">{display.ownerNote ?? "—"}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">{t("profile.renterNote")}</label>
              {editing ? (
                <textarea
                  value={form.renterNote ?? ""}
                  onChange={(e) => updateForm("renterNote", e.target.value || null)}
                  placeholder={t("profile.renterNotePlaceholder")}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-slate-900">{display.renterNote ?? "—"}</p>
              )}
            </div>
            </div>
            </details>
            </div>

            <div className="mt-8 flex flex-wrap gap-6 border-t border-slate-100 pt-6">
              <Link href="/profile/notifications" className="text-sm font-medium text-brand hover:underline">
                {t("profile.notificationPreferences")}
              </Link>
              <Link href="/" className="text-sm font-medium text-brand hover:underline">
                {t("profile.backToHome")}
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
