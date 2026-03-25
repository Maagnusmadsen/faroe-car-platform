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
 */
export function useAuth(): UseAuthResult {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  const fetchAppUser = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      await supabase.auth.getSession();
      // Always ask server who is authenticated (cookie session may exist without client session).
      await fetchAppUser();
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setStatus("unauthenticated");
      } else {
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
