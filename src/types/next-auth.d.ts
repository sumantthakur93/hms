import type { DefaultSession } from "next-auth";

// We use string literals here instead of importing UserRole from
// @prisma/client so the type file can be resolved without Prisma
// (edge runtime compatibility for middleware).
export type UserRole =
  | "ADMIN"
  | "DOCTOR"
  | "PATIENT"
  | "RECEPTIONIST"
  | "LAB_TECHNICIAN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      profileId?: string;
      patientId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    profileId?: string;
    patientId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    profileId?: string;
    patientId?: string;
  }
}
