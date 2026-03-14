"use client";

import { type ReactNode } from "react";

/**
 * App providers. Supabase Auth is used via useAuth() and server getSession();
 * no SessionProvider needed.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
