"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { Logo } from "@/components/Logo";

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
      className={`sticky top-0 z-50 w-full transition-[background-color,border-color] duration-300 ease-out ${
        isSolid
          ? "border-b border-border bg-white"
          : "bg-transparent backdrop-blur-sm"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="mr-3">
          <Logo
            variant={isSolid ? "dark" : "light"}
            href="/"
            responsive="navbar"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
          <NavLinks variant={isSolid ? "light" : variant} />
        </div>
      </nav>
    </header>
  );
}

function NavLinks({ variant }: { variant: Variant }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { user, status, signOut } = useAuth();
  const [hasListings, setHasListings] = useState(false);
  const isTransparent = variant === "transparent";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

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

  const getLinkClass = (href: string) => {
    const active = isActive(href);
    const base = "text-sm font-medium transition-colors duration-200";
    if (isTransparent) {
      return `${base} ${active ? "text-white font-semibold" : "text-white/90 hover:text-white"}`;
    }
    return `${base} ${active ? "text-brand font-semibold" : "text-muted hover:text-brand"}`;
  };

  const buttonClass =
    isTransparent
      ? "rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-light"
      : "rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover";

  return (
    <>
      <Link href="/rent-a-car" className={getLinkClass("/rent-a-car")}>
        {t("nav.rentACar")}
      </Link>
      <Link href="/list-your-car" className={getLinkClass("/list-your-car")}>
        {t("nav.listYourCar")}
      </Link>
      {status === "loading" ? (
        <span className="text-sm font-medium text-slate-600">…</span>
      ) : user ? (
        <>
          <Link href="/bookings" className={getLinkClass("/bookings")}>
            {t("nav.bookingsAndListings")}
          </Link>
          {hasListings === true && (
            <Link href="/owner/dashboard" className={getLinkClass("/owner/dashboard")}>
              {t("ownerDashboard.title")}
            </Link>
          )}
          {user.role === "ADMIN" && (
            <Link href="/admin" className={getLinkClass("/admin")}>
              Admin
            </Link>
          )}
          <Link href="/profile" className={getLinkClass("/profile")}>
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
          <Link href="/login" className={getLinkClass("/login")}>
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
