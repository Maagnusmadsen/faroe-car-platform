"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import en from "@/locales/en.json";
import { getNested } from "@/lib/i18n";

interface LanguageContextValue {
  locale: "en" | "fo";
  setLocale: (locale: "en" | "fo") => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const t = useCallback(
    (key: string) => {
      if (!mounted) return key;
      return getNested(en as Record<string, unknown>, key) || key;
    },
    [mounted]
  );

  return (
    <LanguageContext.Provider
      value={{
        locale: "en",
        setLocale: () => {},
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
