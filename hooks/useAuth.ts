"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/types";

export interface UseAuthResult {
  user: SessionUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Client-side auth: Supabase session + app user from /api/auth/me.
 * Use in place of useSession() from NextAuth.
 */
export function useAuth(): UseAuthResult {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  const fetchAppUser = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const json = await res.json();
      setUser(json.data ?? null);
      setStatus("authenticated");
    } else {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await fetchAppUser();
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await fetchAppUser();
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAppUser, router]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setStatus("unauthenticated");
    router.push("/");
    router.refresh();
  }, [router]);

  return {
    user,
    status,
    signOut,
    refetch: fetchAppUser,
  };
}
