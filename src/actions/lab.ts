"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import type { UserRole } from "@/types/next-auth";
import { LabTestOrderStatus } from "@prisma/client";

// ─── Authorization ─────────────────────────────────────────────────────────────

function requireRole(
  session: { user: { role: UserRole } } | null,
  ...roles: UserRole[]
) {
  if (!session?.user?.role || !roles.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const resultRowSchema = z.object({
  parameter: z.string().min(1, "Parameter is required"),
  value: z.string().min(1, "Value is required"),
  unit: z.string().optional().default(""),
  referenceRange: z.string().optional().default(""),
});

const saveResultsSchema = z.object({
  labTestOrderId: z.string().min(1, "Lab test order ID is required"),
  results: z.array(resultRowSchema),
  notes: z.string().optional(),
  fileUrl: z.string().optional(),
});

// ─── Server Actions ────────────────────────────────────────────────────────────

/**
 * Get the lab test queue — only internal orders, sorted by priority (URGENT first)
 * then FIFO by createdAt. Optionally filter by status.
 * Lab Technician only.
 */
export async function getLabQueue(statusFilter?: string) {
  const session = await auth();
  requireRole(session, "LAB_TECHNICIAN", "ADMIN");

  const where: Record<string, unknown> = { isInternal: true };
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter as LabTestOrderStatus;
  }

  const orders = await prisma.labTestOrder.findMany({
    where: where as Record<string, unknown>,
    include: {
      patient: {
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          gender: true,
          dateOfBirth: true,
        },
      },
      testType: {
        select: { id: true, name: true, code: true, category: true },
      },
      result: true,
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  // Stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const allInternal = await prisma.labTestOrder.findMany({
    where: { isInternal: true },
    select: { status: true, createdAt: true },
  });

  const stats = {
    pending: allInternal.filter(
      (o) => o.status === "ORDERED" || o.status === "SAMPLE_COLLECTED",
    ).length,
    inProgress: allInternal.filter((o) => o.status === "PROCESSING").length,
    completedToday: allInternal.filter(
      (o) =>
        o.status === "COMPLETED" &&
        o.createdAt >= today &&
        o.createdAt < tomorrow,
    ).length,
  };

  return { ok: true as const, orders, stats };
}

/**
 * Get a single lab test order with patient, test type, and result data.
 * Lab Technician / Admin / Doctor (for viewing) only.
 */
export async function getLabOrder(labTestOrderId: string) {
  const session = await auth();
  requireRole(session, "LAB_TECHNICIAN", "ADMIN", "DOCTOR");

  const order = await prisma.labTestOrder.findUnique({
    where: { id: labTestOrderId },
    include: {
      patient: {
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          gender: true,
          dateOfBirth: true,
        },
      },
      testType: true,
      result: true,
    },
  });

  if (!order) {
    return { ok: false as const, error: "Lab test order not found" };
  }

  return { ok: true as const, order };
}

/**
 * Collect a sample — sets status from ORDERED to SAMPLE_COLLECTED.
 * Lab Technician only.
 */
export async function collectSample(labTestOrderId: string) {
  const session = await auth();
  requireRole(session, "LAB_TECHNICIAN", "ADMIN");

  const order = await prisma.labTestOrder.findUnique({
    where: { id: labTestOrderId },
  });

  if (!order) {
    return { ok: false as const, error: "Lab test order not found" };
  }

  if (order.status !== "ORDERED") {
    return {
      ok: false as const,
      error: "Sample can only be collected for ORDERED tests",
    };
  }

  const updated = await prisma.labTestOrder.update({
    where: { id: labTestOrderId },
    data: { status: LabTestOrderStatus.SAMPLE_COLLECTED },
  });

  return { ok: true as const, order: updated };
}

/**
 * Save draft results — creates/updates a LabResult and sets status to PROCESSING.
 * Lab Technician only.
 */
export async function saveDraftResults(
  input: z.infer<typeof saveResultsSchema>,
) {
  const session = await auth();
  requireRole(session, "LAB_TECHNICIAN", "ADMIN");

  const parsed = saveResultsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const order = await prisma.labTestOrder.findUnique({
    where: { id: parsed.data.labTestOrderId },
    include: { result: true },
  });

  if (!order) {
    return { ok: false as const, error: "Lab test order not found" };
  }

  if (order.status !== "SAMPLE_COLLECTED" && order.status !== "PROCESSING") {
    return {
      ok: false as const,
      error:
        "Results can only be entered for SAMPLE_COLLECTED or PROCESSING tests",
    };
  }

  // Create or update result
  if (order.result) {
    await prisma.labResult.update({
      where: { id: order.result.id },
      data: {
        results: parsed.data.results as Record<string, string>[],
        notes: parsed.data.notes || null,
        fileUrl: parsed.data.fileUrl || null,
      },
    });
  } else {
    await prisma.labResult.create({
      data: {
        labTestOrderId: parsed.data.labTestOrderId,
        results: parsed.data.results as Record<string, string>[],
        notes: parsed.data.notes || null,
        fileUrl: parsed.data.fileUrl || null,
      },
    });
  }

  // Set status to PROCESSING
  const updated = await prisma.labTestOrder.update({
    where: { id: parsed.data.labTestOrderId },
    data: { status: LabTestOrderStatus.PROCESSING },
  });

  return { ok: true as const, order: updated };
}

/**
 * Submit final results — saves the result and sets status to COMPLETED.
 * Lab Technician only.
 */
export async function submitResults(input: z.infer<typeof saveResultsSchema>) {
  const session = await auth();
  requireRole(session, "LAB_TECHNICIAN", "ADMIN");

  const parsed = saveResultsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  if (parsed.data.results.length === 0) {
    return {
      ok: false as const,
      error: "At least one result row is required to submit",
    };
  }

  const order = await prisma.labTestOrder.findUnique({
    where: { id: parsed.data.labTestOrderId },
    include: { result: true },
  });

  if (!order) {
    return { ok: false as const, error: "Lab test order not found" };
  }

  if (order.status !== "SAMPLE_COLLECTED" && order.status !== "PROCESSING") {
    return {
      ok: false as const,
      error:
        "Results can only be submitted for SAMPLE_COLLECTED or PROCESSING tests",
    };
  }

  // Create or update result
  if (order.result) {
    await prisma.labResult.update({
      where: { id: order.result.id },
      data: {
        results: parsed.data.results as Record<string, string>[],
        notes: parsed.data.notes || null,
        fileUrl: parsed.data.fileUrl || null,
      },
    });
  } else {
    await prisma.labResult.create({
      data: {
        labTestOrderId: parsed.data.labTestOrderId,
        results: parsed.data.results as Record<string, string>[],
        notes: parsed.data.notes || null,
        fileUrl: parsed.data.fileUrl || null,
      },
    });
  }

  // Set status to COMPLETED
  const updated = await prisma.labTestOrder.update({
    where: { id: parsed.data.labTestOrderId },
    data: { status: LabTestOrderStatus.COMPLETED },
  });

  return { ok: true as const, order: updated };
}

/**
 * Get completed lab tests (history view).
 * Lab Technician / Admin only.
 */
export async function getCompletedTests() {
  const session = await auth();
  requireRole(session, "LAB_TECHNICIAN", "ADMIN");

  const orders = await prisma.labTestOrder.findMany({
    where: { isInternal: true, status: "COMPLETED" },
    include: {
      patient: {
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
        },
      },
      testType: {
        select: { name: true, code: true },
      },
      result: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return { ok: true as const, orders };
}

// ─── Test Type Master Data CRUD ───────────────────────────────────────────────

const testTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  category: z.string().min(1, "Category is required"),
  price: z.number().min(0, "Price must be ≥ 0"),
  description: z.string().optional(),
});

export type TestTypeInput = z.infer<typeof testTypeSchema>;

/**
 * Get all test types (including inactive).
 * Admin only.
 */
export async function getTestTypes() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Unauthorized" };
  }

  const testTypes = await prisma.testType.findMany({
    orderBy: { name: "asc" },
  });

  return { ok: true as const, testTypes };
}

/**
 * Get a single test type by ID.
 * Admin only.
 */
export async function getTestType(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Unauthorized" };
  }

  const testType = await prisma.testType.findUnique({ where: { id } });

  if (!testType) {
    return { ok: false as const, error: "Test type not found" };
  }

  return { ok: true as const, testType };
}

/**
 * Create a new test type.
 * Admin only.
 */
export async function createTestType(input: TestTypeInput) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Unauthorized" };
  }

  const parsed = testTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const testType = await prisma.testType.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        category: parsed.data.category,
        price: parsed.data.price,
        description: parsed.data.description || null,
      },
    });

    return { ok: true as const, testType };
  } catch {
    return {
      ok: false as const,
      error: "A test type with this name or code already exists",
    };
  }
}

/**
 * Update an existing test type.
 * Admin only.
 */
export async function updateTestType(id: string, input: TestTypeInput) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Unauthorized" };
  }

  const parsed = testTypeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const existing = await prisma.testType.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false as const, error: "Test type not found" };
  }

  try {
    const testType = await prisma.testType.update({
      where: { id },
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        category: parsed.data.category,
        price: parsed.data.price,
        description: parsed.data.description || null,
      },
    });

    return { ok: true as const, testType };
  } catch {
    return {
      ok: false as const,
      error: "A test type with this name or code already exists",
    };
  }
}

/**
 * Deactivate a test type (soft delete).
 * Admin only.
 */
export async function deactivateTestType(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false as const, error: "Unauthorized" };
  }

  const existing = await prisma.testType.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false as const, error: "Test type not found" };
  }

  await prisma.testType.update({
    where: { id },
    data: { active: false },
  });

  return { ok: true as const };
}
