"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

const AUTO_DISMISS_MS = 8000;

/**
 * One-time banner when URL has ?welcome=1 (set only after email confirmation via /auth/verify?type=signup).
 * Strips the param immediately so refresh does not show it again.
 */
export default function WelcomeAfterSignupBanner() {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("welcome") !== "1") return;
    setOpen(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("welcome");
    const q = params.toString();
    const next = q ? `${pathname}?${q}` : pathname;
    router.replace(next, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setOpen(false), AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))]"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-lg items-center gap-3 rounded-xl border border-brand/30 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-50">
        <span className="font-medium">{t("auth.welcomeAfterSignup")}</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label={t("auth.dismissWelcome")}
        >
          ×
        </button>
      </div>
    </div>
  );
}
