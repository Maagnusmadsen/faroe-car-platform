"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";

type Variant = "light" | "transparent";

interface NavbarProps {
  variant?: Variant;
}

const SCROLL_THRESHOLD = 24;

export default function Navbar({ variant = "light" }: NavbarProps) {
  const isTransparentVariant = variant === "transparent";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isTransparentVariant) return;
    const handleScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isTransparentVariant]);

  const isGlass = isTransparentVariant && !scrolled;
  const isSolid = !isTransparentVariant || scrolled;

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors duration-200 ${
        isSolid
          ? "border-b border-slate-200 bg-white"
          : "bg-transparent backdrop-blur-sm"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div
            className={
              isSolid
                ? "flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white"
                : "flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 font-bold text-emerald-600"
            }
          >
            F
          </div>
          <span
            className={`text-xl font-bold ${isSolid ? "text-slate-900" : "text-white"}`}
          >
            FaroeRent
          </span>
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
          <NavLinks variant={isSolid ? "light" : variant} />
        </div>
      </nav>
    </header>
  );
}

function NavLinks({ variant }: { variant: Variant }) {
  const { t } = useLanguage();
  const { user, status, signOut } = useAuth();
  // Default false: only show "Your earnings" after API confirms hasListings === true
  const [hasListings, setHasListings] = useState(false);
  const isTransparent = variant === "transparent";

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setHasListings(false);
      return;
    }
    const aborter = new AbortController();
    fetch(`/api/owner/has-listings?_=${Date.now()}`, { cache: "no-store", signal: aborter.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        setHasListings(Boolean(json?.data?.hasListings));
      })
      .catch(() => setHasListings(false));
    return () => aborter.abort();
  }, [status, user]);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    const onFocus = () => {
      fetch(`/api/owner/has-listings?_=${Date.now()}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => setHasListings(Boolean(json?.data?.hasListings)))
        .catch(() => setHasListings(false));
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status, user]);

  const linkClass = `text-sm font-medium ${
    isTransparent
      ? "text-white/90 hover:text-white"
      : "text-slate-600 hover:text-slate-900"
  }`;

  const buttonClass =
    isTransparent
      ? "rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-600"
      : "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700";

  return (
    <>
      <Link href="/rent-a-car" className={linkClass}>
        {t("nav.rentACar")}
      </Link>
      <Link href="/list-your-car" className={linkClass}>
        {t("nav.listYourCar")}
      </Link>
      {status === "loading" ? (
        <span className={linkClass}>…</span>
      ) : user ? (
        <>
          <Link href="/bookings" className={linkClass}>
            {t("nav.bookingsAndListings")}
          </Link>
          {hasListings === true && (
            <Link href="/owner/dashboard" className={linkClass}>
              {t("ownerDashboard.title")}
            </Link>
          )}
          {user.role === "ADMIN" && (
            <Link href="/admin" className={linkClass}>
              Admin
            </Link>
          )}
          <Link href="/profile" className={linkClass}>
            {t("auth.profile")}
          </Link>
          <button
            type="button"
            onClick={() => signOut()}
            className={buttonClass}
          >
            {t("auth.logout")}
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className={linkClass}>
            {t("nav.login")}
          </Link>
          <Link href="/signup" className={buttonClass}>
            {t("nav.signUp")}
          </Link>
        </>
      )}
    </>
  );
}
