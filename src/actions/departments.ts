"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
