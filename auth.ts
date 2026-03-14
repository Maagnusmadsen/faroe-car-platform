/**
 * NextAuth v5 – main export. Use auth() in server components/API, useSession() in client.
 * Credentials provider uses JWT session. Add PrismaAdapter when adding OAuth providers.
 */

import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { getNextAuthSecret } from "@/config/env";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // Explicitly provide the secret so Auth.js doesn't rely on default env names.
  secret: getNextAuthSecret(),
});
