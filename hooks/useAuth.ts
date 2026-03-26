"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
 */
export function useAuth(): UseAuthResult {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  // Prevents concurrent /api/auth/me fetches triggered by rapid auth events.
  const fetchInFlight = useRef(false);

  const fetchAppUser = useCallback(async () => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setUser(json.data ?? null);
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
    } finally {
      fetchInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // onAuthStateChange fires INITIAL_SESSION immediately on registration,
    // which replaces the old init() + getSession() pattern and eliminates
    // the duplicate fetchAppUser() call that caused the race condition.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setStatus("unauthenticated");
      } else {
        // Covers INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED.
        // Cookie-only server sessions are resolved via /api/auth/me regardless
        // of whether the client-side session is null.
        await fetchAppUser();
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
