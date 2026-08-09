"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
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

const medicineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  genericName: z.string().min(1, "Generic name is required"),
  manufacturer: z.string().optional(),
  category: z.string().optional(),
  unitPrice: z.number().min(0, "Unit price must be ≥ 0"),
  reorderLevel: z.number().int().min(0, "Reorder level must be ≥ 0"),
  active: z.boolean().default(true),
});

const batchSchema = z.object({
  medicineId: z.string().min(1, "Medicine is required"),
  batchNumber: z.string().min(1, "Batch number is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  supplier: z.string().optional(),
});

const adjustmentSchema = z.object({
  batchId: z.string().min(1, "Batch is required"),
  newQty: z.number().int().min(0, "New quantity must be ≥ 0"),
  reason: z.enum(["DAMAGE", "RECOUNT", "OTHER"]),
  notes: z.string().optional(),
});

const dispenseSchema = z.object({
  prescriptionId: z.string().min(1, "Prescription is required"),
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isExpired(expiryDate: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(expiryDate) <= today;
}

function isNearExpiry(expiryDate: Date): boolean {
  const days30 = 30 * 24 * 60 * 60 * 1000;
  return !isExpired(expiryDate) && new Date(expiryDate).getTime() - Date.now() < days30;
}

function batchStatus(expiryDate: Date): "FRESH" | "NEAR_EXPIRY" | "EXPIRED" {
  if (isExpired(expiryDate)) return "EXPIRED";
  if (isNearExpiry(expiryDate)) return "NEAR_EXPIRY";
  return "FRESH";
}

// ─── Medicine CRUD ─────────────────────────────────────────────────────────────

/**
 * List medicines with search, category filter, and stock calculations.
 * Admin only.
 */
export async function getMedicines(opts?: {
  search?: string;
  category?: string;
  activeOnly?: boolean;
  lowStockOnly?: boolean;
}) {
  const session = await auth();
  requireRole(session, "ADMIN");

  const where: Record<string, unknown> = {};
  if (opts?.activeOnly) where.active = true;
  if (opts?.category && opts.category !== "ALL") where.category = opts.category;
  if (opts?.search) {
    where.OR = [
      { name: { contains: opts.search, mode: "insensitive" } },
      { genericName: { contains: opts.search, mode: "insensitive" } },
      { manufacturer: { contains: opts.search, mode: "insensitive" } },
    ];
  }

  const medicines = await prisma.medicine.findMany({
    where: where as Record<string, unknown>,
    include: {
      batches: { select: { id: true, expiryDate: true, quantity: true } },
    },
    orderBy: { name: "asc" },
  });

  // Calculate non-expired stock per medicine
  const enriched = medicines.map((med) => {
    const nonExpiredBatches = med.batches.filter(
      (b) => !isExpired(b.expiryDate),
    );
    const totalStock = nonExpiredBatches.reduce((sum, b) => sum + b.quantity, 0);
    const stockStatus =
      totalStock === 0 ? "OUT_OF_STOCK" : totalStock <= med.reorderLevel ? "LOW_STOCK" : "IN_STOCK";
    return {
      id: med.id,
      name: med.name,
      genericName: med.genericName,
      manufacturer: med.manufacturer,
      category: med.category,
      unitPrice: med.unitPrice,
      reorderLevel: med.reorderLevel,
      active: med.active,
      totalStock,
      stockStatus,
      batchCount: med.batches.length,
    };
  });

  const filtered = opts?.lowStockOnly
    ? enriched.filter((m) => m.stockStatus !== "IN_STOCK")
    : enriched;

  return { ok: true as const, medicines: filtered };
}

/**
 * Get a single medicine with all batches.
 * Admin only.
 */
export async function getMedicine(id: string) {
  const session = await auth();
  requireRole(session, "ADMIN");

  const medicine = await prisma.medicine.findUnique({
    where: { id },
    include: {
      batches: { orderBy: { expiryDate: "asc" } },
    },
  });

  if (!medicine) {
    return { ok: false as const, error: "Medicine not found" };
  }

  const nonExpiredBatches = medicine.batches.filter(
    (b) => !isExpired(b.expiryDate),
  );
  const totalStock = nonExpiredBatches.reduce((sum, b) => sum + b.quantity, 0);
  const totalValue = totalStock * medicine.unitPrice;

  const batches = medicine.batches.map((b, index) => ({
    ...b,
    status: batchStatus(b.expiryDate),
    fefoOrder: !isExpired(b.expiryDate) ? index + 1 : null,
  }));

  return {
    ok: true as const,
    medicine: {
      ...medicine,
      batches,
      totalStock,
      totalValue,
      stockStatus:
        totalStock === 0
          ? "OUT_OF_STOCK"
          : totalStock <= medicine.reorderLevel
            ? "LOW_STOCK"
            : "IN_STOCK",
    },
  };
}

/**
 * Create a new medicine.
 * Admin only.
 */
export async function createMedicine(input: z.infer<typeof medicineSchema>) {
  const session = await auth();
  requireRole(session, "ADMIN");

  const parsed = medicineSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const medicine = await prisma.medicine.create({
      data: parsed.data,
    });
    return { ok: true as const, medicine };
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") {
      return { ok: false as const, error: "Medicine name already exists" };
    }
    throw e;
  }
}

/**
 * Update a medicine.
 * Admin only.
 */
export async function updateMedicine(
  id: string,
  input: Partial<z.infer<typeof medicineSchema>>,
) {
  const session = await auth();
  requireRole(session, "ADMIN");

  const parsed = medicineSchema.partial().safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  try {
    const medicine = await prisma.medicine.update({
      where: { id },
      data: parsed.data,
    });
    return { ok: true as const, medicine };
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") {
      return { ok: false as const, error: "Medicine name already exists" };
    }
    if ((e as { code?: string })?.code === "P2025") {
      return { ok: false as const, error: "Medicine not found" };
    }
    throw e;
  }
}

/**
 * Deactivate (soft-delete) a medicine.
 * Admin only.
 */
export async function deactivateMedicine(id: string) {
  const session = await auth();
  requireRole(session, "ADMIN");

  try {
    const medicine = await prisma.medicine.update({
      where: { id },
      data: { active: false },
    });
    return { ok: true as const, medicine };
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2025") {
      return { ok: false as const, error: "Medicine not found" };
    }
    throw e;
  }
}

// ─── Batch Management ──────────────────────────────────────────────────────────

/**
 * Add a batch to a medicine.
 * Admin only.
 */
export async function addBatch(input: z.infer<typeof batchSchema>) {
  const session = await auth();
  requireRole(session, "ADMIN");

  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const medicine = await prisma.medicine.findUnique({
    where: { id: parsed.data.medicineId },
  });
  if (!medicine) {
    return { ok: false as const, error: "Medicine not found" };
  }

  try {
    const batch = await prisma.medicineBatch.create({
      data: {
        medicineId: parsed.data.medicineId,
        batchNumber: parsed.data.batchNumber,
        expiryDate: new Date(parsed.data.expiryDate),
        quantity: parsed.data.quantity,
      },
    });
    return { ok: true as const, batch };
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002") {
      return {
        ok: false as const,
        error: "Batch number already exists for this medicine",
      };
    }
    throw e;
  }
}

/**
 * Adjust batch quantity with audit log.
 * Admin only.
 */
export async function adjustStock(input: z.infer<typeof adjustmentSchema>) {
  const session = await auth();
  const user = requireRole(session, "ADMIN");

  const parsed = adjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const batch = await prisma.medicineBatch.findUnique({
    where: { id: parsed.data.batchId },
  });
  if (!batch) {
    return { ok: false as const, error: "Batch not found" };
  }

  // Update batch quantity
  const updated = await prisma.medicineBatch.update({
    where: { id: parsed.data.batchId },
    data: { quantity: parsed.data.newQty },
  });

  // Log adjustment
  await prisma.stockAdjustment.create({
    data: {
      batchId: parsed.data.batchId,
      oldQty: batch.quantity,
      newQty: parsed.data.newQty,
      reason: parsed.data.reason,
      notes: parsed.data.notes || null,
      userId: user.id,
    },
  });

  return { ok: true as const, batch: updated };
}

// ─── Low Stock Alerts ──────────────────────────────────────────────────────────

/**
 * Get low-stock medicines (total non-expired stock ≤ reorder level).
 * Admin only.
 */
export async function getLowStockMedicines() {
  const session = await auth();
  requireRole(session, "ADMIN");

  const medicines = await prisma.medicine.findMany({
    where: { active: true },
    include: {
      batches: { select: { expiryDate: true, quantity: true } },
    },
  });

  const lowStock = medicines
    .map((med) => {
      const totalStock = med.batches
        .filter((b) => !isExpired(b.expiryDate))
        .reduce((sum, b) => sum + b.quantity, 0);
      return { id: med.id, name: med.name, totalStock, reorderLevel: med.reorderLevel };
    })
    .filter((m) => m.totalStock <= m.reorderLevel);

  return { ok: true as const, medicines: lowStock };
}

// ─── FEFO Dispensing ───────────────────────────────────────────────────────────

/**
 * Dispense a prescription using FEFO (First Expiry, First Out).
 * Selects batches by earliest expiry date, splits across batches if needed.
 * Marks prescription items as dispensed and reduces batch quantities.
 * Admin/Receptionist only.
 */
export async function dispensePrescription(input: z.infer<typeof dispenseSchema>) {
  const session = await auth();
  requireRole(session, "ADMIN", "RECEPTIONIST");

  const parsed = dispenseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const prescription = await prisma.prescription.findUnique({
    where: { id: parsed.data.prescriptionId },
    include: { items: true },
  });

  if (!prescription) {
    return { ok: false as const, error: "Prescription not found" };
  }

  // Check if already fully dispensed
  const allDispensed = prescription.items.every((item) => item.dispensed);
  if (allDispensed) {
    return { ok: false as const, error: "Prescription already dispensed" };
  }

  // For each item, find batches via FEFO
  const dispensePlan: Array<{
    itemId: string;
    medicineId: string;
    medicineName: string;
    needed: number;
    allocations: Array<{ batchId: string; batchNumber: string; qty: number }>;
    insufficient: boolean;
  }> = [];

  for (const item of prescription.items) {
    if (item.dispensed) continue;

    const batches = await prisma.medicineBatch.findMany({
      where: {
        medicineId: item.medicineId,
        quantity: { gt: 0 },
      },
      orderBy: { expiryDate: "asc" },
    });

    // Filter out expired batches
    const validBatches = batches.filter((b) => !isExpired(b.expiryDate));

    let remaining = item.quantity;
    const allocations: Array<{ batchId: string; batchNumber: string; qty: number }> = [];

    for (const batch of validBatches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.quantity, remaining);
      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        qty: take,
      });
      remaining -= take;
    }

    const medicine = await prisma.medicine.findUnique({
      where: { id: item.medicineId },
      select: { name: true },
    });

    dispensePlan.push({
      itemId: item.id,
      medicineId: item.medicineId,
      medicineName: medicine?.name ?? "Unknown",
      needed: item.quantity,
      allocations,
      insufficient: remaining > 0,
    });
  }

  // Check if any item has insufficient stock
  const insufficientItems = dispensePlan.filter((p) => p.insufficient);
  if (insufficientItems.length > 0) {
    return {
      ok: false as const,
      error: `Insufficient stock for: ${insufficientItems.map((i) => i.medicineName).join(", ")}`,
      dispensePlan,
    };
  }

  // Execute dispensing in a transaction
  await prisma.$transaction(async (tx) => {
    for (const plan of dispensePlan) {
      for (const alloc of plan.allocations) {
        // Reduce batch quantity
        const batch = await tx.medicineBatch.findUnique({
          where: { id: alloc.batchId },
        });
        if (batch) {
          await tx.medicineBatch.update({
            where: { id: alloc.batchId },
            data: { quantity: batch.quantity - alloc.qty },
          });
        }
      }
      // Mark item as dispensed
      await tx.prescriptionItem.update({
        where: { id: plan.itemId },
        data: { dispensed: true },
      });
    }
  });

  return { ok: true as const, dispensePlan };
}

/**
 * Preview the FEFO dispensing plan without executing it.
 * Admin/Receptionist only.
 */
export async function previewDispense(prescriptionId: string) {
  const session = await auth();
  requireRole(session, "ADMIN", "RECEPTIONIST");

  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: { items: { include: { medicine: true } } },
  });

  if (!prescription) {
    return { ok: false as const, error: "Prescription not found" };
  }

  const plan: Array<{
    itemId: string;
    medicineName: string;
    needed: number;
    allocations: Array<{ batchId: string; batchNumber: string; expiryDate: Date; qty: number }>;
    insufficient: boolean;
    dispensed: boolean;
  }> = [];

  for (const item of prescription.items) {
    const batches = await prisma.medicineBatch.findMany({
      where: {
        medicineId: item.medicineId,
        quantity: { gt: 0 },
      },
      orderBy: { expiryDate: "asc" },
    });

    const validBatches = batches.filter((b) => !isExpired(b.expiryDate));

    let remaining = item.quantity;
    const allocations: Array<{ batchId: string; batchNumber: string; expiryDate: Date; qty: number }> = [];

    for (const batch of validBatches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.quantity, remaining);
      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        qty: take,
      });
      remaining -= take;
    }

    plan.push({
      itemId: item.id,
      medicineName: item.medicine.name,
      needed: item.quantity,
      allocations,
      insufficient: remaining > 0,
      dispensed: item.dispensed,
    });
  }

  return { ok: true as const, plan };
}
