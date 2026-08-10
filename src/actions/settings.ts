"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { hashPassword } from "@/lib/password";
import type { UserRole } from "@/types/next-auth";

// ─── Authorization ─────────────────────────────────────────────────────────────

function requireRole(
  session: { user: { role: UserRole; id: string } } | null,
  ...roles: UserRole[]
) {
  if (!session?.user?.role || !roles.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const hospitalSettingSchema = z.object({
  name: z.string().min(1, "Hospital name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  logoUrl: z.string().optional(),
});

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "DOCTOR", "RECEPTIONIST", "LAB_TECHNICIAN"]),
});

// ─── Hospital Settings ─────────────────────────────────────────────────────────

/**
 * Get the hospital setting (singleton row).
 * Admin only.
 */
export async function getHospitalSetting() {
  const session = await auth();
  requireRole(session, "ADMIN");

  let setting = await prisma.hospitalSetting.findFirst();

  if (!setting) {
    setting = await prisma.hospitalSetting.create({
      data: { name: "CarePoint Hospital" },
    });
  }

  return { ok: true as const, setting };
}

/**
 * Update the hospital setting.
 * Admin only.
 */
export async function updateHospitalSetting(
  input: z.infer<typeof hospitalSettingSchema>,
) {
  const session = await auth();
  requireRole(session, "ADMIN");

  const parsed = hospitalSettingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const data = parsed.data;

  // Get or create the singleton row
  let setting = await prisma.hospitalSetting.findFirst();
  if (!setting) {
    setting = await prisma.hospitalSetting.create({
      data: { name: data.name },
    });
  }

  const updated = await prisma.hospitalSetting.update({
    where: { id: setting.id },
    data: {
      name: data.name,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      logoUrl: data.logoUrl || null,
    },
  });

  return { ok: true as const, setting: updated };
}

// ─── User Management ───────────────────────────────────────────────────────────

/**
 * Get all system users.
 * Admin only.
 */
export async function getUsers() {
  const session = await auth();
  requireRole(session, "ADMIN");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return { ok: true as const, users };
}

/**
 * Create a new staff user account (admin, doctor, receptionist, lab technician).
 * Admin only.
 */
export async function createUser(input: z.infer<typeof createUserSchema>) {
  const session = await auth();
  requireRole(session, "ADMIN");

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const data = parsed.data;

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    return { ok: false as const, error: "An account with this email already exists" };
  }

  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return { ok: true as const, user };
}

/**
 * Deactivate a user account by setting a flag.
 * Since there's no "active" field on User, we delete the user.
 * Admin only. Cannot deactivate self.
 */
export async function deactivateUser(userId: string) {
  const session = await auth();
  const user = requireRole(session, "ADMIN");

  if (userId === user.id) {
    return { ok: false as const, error: "Cannot deactivate your own account" };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { ok: false as const, error: "User not found" };
  }

  await prisma.user.delete({ where: { id: userId } });

  return { ok: true as const };
}

/**
 * Reset a user's password.
 * Admin only.
 */
export async function resetPassword(
  userId: string,
  newPassword: string,
) {
  const session = await auth();
  requireRole(session, "ADMIN");

  if (newPassword.length < 6) {
    return { ok: false as const, error: "Password must be at least 6 characters" };
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { ok: false as const, error: "User not found" };
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { ok: true as const };
}
