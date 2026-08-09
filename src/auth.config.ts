import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible Auth.js configuration.
 *
 * This file intentionally avoids importing Prisma (not edge-compatible).
 * It is used by middleware for route protection. The full config with
 * the Prisma adapter lives in auth.ts.
 */
export default {
  pages: {
    signIn: "/login",
  },
  providers: [], // Populated in auth.ts
} satisfies NextAuthConfig;
