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
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (process.env.NEXT_PUBLIC_AUTH_DEBUG === "1") {
      console.info("[AuthDebug] /api/auth/me status", res.status);
    }
    if (res.ok) {
      const json = await res.json();
      setUser(json.data ?? null);
      setStatus("authenticated");
      if (process.env.NEXT_PUBLIC_AUTH_DEBUG === "1") {
        console.info("[AuthDebug] Authenticated user from /api/auth/me", json?.data?.id ?? null);
      }
    } else {
      setUser(null);
      setStatus("unauthenticated");
      if (process.env.NEXT_PUBLIC_AUTH_DEBUG === "1") {
        console.info("[AuthDebug] /api/auth/me returned unauthenticated");
      }
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (process.env.NEXT_PUBLIC_AUTH_DEBUG === "1") {
        console.info("[AuthDebug] supabase.auth.getSession() on init", {
          hasSession: !!session,
          userId: session?.user?.id ?? null,
        });
      }
      // Important: always ask server who is authenticated.
      // After email-confirm redirect, cookie session may exist even when browser client session is empty.
      await fetchAppUser();
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (process.env.NEXT_PUBLIC_AUTH_DEBUG === "1") {
        console.info("[AuthDebug] onAuthStateChange", {
          event,
          hasSession: !!session,
          userId: session?.user?.id ?? null,
        });
      }
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
