import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible Auth.js configuration.
 *
 * This file intentionally avoids importing Prisma (not edge-compatible).
 * It is used by middleware for route protection. The full config with
 * the Credentials provider lives in auth.ts.
 *
 * The JWT and session callbacks live here (not in auth.ts) so that
 * middleware can read `role` from the JWT token.
 */
export default {
  pages: {
    signIn: "/login",
  },
  providers: [], // Populated in auth.ts
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.profileId = (user as { profileId?: string }).profileId;
        token.patientId = (user as { patientId?: string }).patientId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as
          | "ADMIN"
          | "DOCTOR"
          | "PATIENT"
          | "RECEPTIONIST"
          | "LAB_TECHNICIAN";
        session.user.profileId = token.profileId as string | undefined;
        session.user.patientId = token.patientId as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
