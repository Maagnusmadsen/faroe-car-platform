"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { Logo } from "@/components/Logo";

type Variant = "light" | "transparent";

interface NavbarProps {
  variant?: Variant;
}

const SCROLL_THRESHOLD = 24;

export default function Navbar({ variant = "light" }: NavbarProps) {
  const { t } = useLanguage();
  const isTransparentVariant = variant === "transparent";
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isTransparentVariant) return;
    const handleScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isTransparentVariant]);

  useEffect(() => {
    const handler = () => setMobileMenuOpen(false);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const isSolid = !isTransparentVariant || scrolled;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const mobileMenu = mobileMenuOpen && mounted && (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-slate-900/60 sm:hidden"
        aria-hidden
        onClick={() => setMobileMenuOpen(false)}
      />
      <div
        className="fixed inset-y-0 right-0 z-[9999] flex w-full max-w-[320px] flex-col border-l border-slate-200 bg-white shadow-2xl sm:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <span className="text-sm font-semibold text-slate-700">{t("nav.openMenu")}</span>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("nav.closeMenu")}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          <NavLinks
            variant="light"
            mobile
            onNavigate={() => setMobileMenuOpen(false)}
          />
        </nav>
      </div>
    </>
  );

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-[background-color,border-color] duration-300 ease-out ${
        isSolid
          ? "border-b border-border bg-white"
          : "bg-transparent backdrop-blur-sm max-sm:bg-black/25 max-sm:backdrop-blur-md"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="mr-2 flex min-w-0 shrink-0 sm:mr-3">
          <Logo
            variant={isSolid ? "dark" : "light"}
            href="/"
            responsive="navbar"
          />
        </div>

        {/* Desktop nav — hidden on mobile */}
        <div className="hidden items-center justify-end gap-3 sm:flex sm:gap-4">
          <NavLinks variant={isSolid ? "light" : variant} />
        </div>

        {/* Mobile: hamburger + overlay menu */}
        <div className="flex items-center sm:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className={`relative z-[60] -mr-2 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand ${
              isSolid ? "text-slate-600 hover:bg-slate-100" : "text-white hover:bg-white/20"
            }`}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu — rendered via portal to avoid stacking/overflow issues */}
      {mobileMenu && createPortal(mobileMenu, document.body)}
    </header>
  );
}

function NavLinks({
  variant,
  mobile,
  onNavigate,
}: {
  variant: Variant;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
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

  const wrap = (children: React.ReactNode) => {
    if (!mobile) return children;
    return (
      <div className="flex flex-col gap-1">
        {children}
      </div>
    );
  };

  const getLinkClass = (href: string) => {
    const active = isActive(href);
    const base = "text-sm font-medium transition-colors duration-200";
    const mobileExtra = mobile
      ? "flex min-h-[44px] items-center rounded-lg px-4 py-3 -mx-1"
      : "";
    if (isTransparent && !mobile) {
      return `${base} ${active ? "text-white font-semibold" : "text-white/90 hover:text-white"}`;
    }
    if (mobile) {
      return `${base} ${mobileExtra} ${active ? "text-brand font-semibold bg-brand/10" : "text-slate-700 hover:bg-slate-100"}`;
    }
    return `${base} ${active ? "text-brand font-semibold" : "text-muted hover:text-brand"}`;
  };

  const buttonClass = mobile
    ? "flex min-h-[44px] w-full items-center justify-center rounded-lg bg-brand px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-hover"
    : isTransparent
      ? "rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-light"
      : "rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover";

  const handleNavigate = () => {
    onNavigate?.();
  };

  return wrap(
    <>
      <Link href="/rent-a-car" className={getLinkClass("/rent-a-car")} onClick={handleNavigate}>
        {t("nav.rentACar")}
      </Link>
      <Link href="/list-your-car" className={getLinkClass("/list-your-car")} onClick={handleNavigate}>
        {t("nav.listYourCar")}
      </Link>
      {status === "loading" ? (
        <span className="px-4 py-3 text-sm font-medium text-slate-600">…</span>
      ) : user ? (
        <>
          <Link href="/bookings" className={getLinkClass("/bookings")} onClick={handleNavigate}>
            {t("nav.bookingsAndListings")}
          </Link>
          {hasListings === true && (
            <Link href="/owner/dashboard" className={getLinkClass("/owner/dashboard")} onClick={handleNavigate}>
              {t("ownerDashboard.title")}
            </Link>
          )}
          {user.role === "ADMIN" && (
            <Link href="/admin" className={getLinkClass("/admin")} onClick={handleNavigate}>
              Admin
            </Link>
          )}
          <Link href="/profile" className={getLinkClass("/profile")} onClick={handleNavigate}>
            {t("auth.profile")}
          </Link>
          <button
            type="button"
            onClick={() => {
              signOut();
              handleNavigate();
            }}
            className={buttonClass}
          >
            {t("auth.logout")}
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className={getLinkClass("/login")} onClick={handleNavigate}>
            {t("nav.login")}
          </Link>
          <Link href="/signup" className={buttonClass} onClick={handleNavigate}>
            {t("nav.signUp")}
          </Link>
        </>
      )}
    </>
  );
}
