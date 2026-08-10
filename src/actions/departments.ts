"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ─── Schemas ───────────────────────────────────────────────────────────────────

const departmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  consultationFee: z.number().min(0, "Consultation fee must be ≥ 0"),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;

// ─── Queries ───────────────────────────────────────────────────────────────────

/**
 * Get all departments, ordered by name.
 * Available to all authenticated roles.
 */
export async function getDepartments() {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { doctors: true } } },
  });

  return { ok: true as const, departments };
}

/**
 * Get a department by ID.
 * Available to all authenticated roles.
 */
export async function getDepartment(id: string) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const department = await prisma.department.findUnique({
    where: { id },
  });

  if (!department) {
    return { ok: false as const, error: "Department not found" };
  }

  return { ok: true as const, department };
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Create a new department.
 * Admin only.
 */
export async function createDepartment(input: DepartmentInput) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Unauthorized" };
  }

  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const department = await prisma.department.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        consultationFee: parsed.data.consultationFee,
      },
    });

    return { ok: true as const, department };
  } catch {
    return {
      ok: false as const,
      error: "A department with this name already exists",
    };
  }
}

/**
 * Update an existing department.
 * Admin only.
 */
export async function updateDepartment(id: string, input: DepartmentInput) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Unauthorized" };
  }

  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false as const, error: "Department not found" };
  }

  try {
    const department = await prisma.department.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        consultationFee: parsed.data.consultationFee,
      },
    });

    return { ok: true as const, department };
  } catch {
    return {
      ok: false as const,
      error: "A department with this name already exists",
    };
  }
}

/**
 * Delete a department.
 * Admin only. Prevents deletion if doctors are assigned.
 */
export async function deleteDepartment(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Unauthorized" };
  }

  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false as const, error: "Department not found" };
  }

  const doctorCount = await prisma.doctorProfile.count({
    where: { departmentId: id },
  });
  if (doctorCount > 0) {
    return {
      ok: false as const,
      error: `Cannot delete: ${doctorCount} doctor${doctorCount !== 1 ? "s" : ""} assigned to this department. Reassign them first.`,
    };
  }

  await prisma.department.delete({ where: { id } });

  return { ok: true as const };
}
