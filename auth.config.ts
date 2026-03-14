/**
 * NextAuth v5 – edge-compatible config (for middleware).
 * This app uses Supabase Auth; NextAuth is kept for compatibility. Providers can be added here if needed.
 */
export const authConfig = {
  providers: [],
  pages: { signIn: "/login" },
};
