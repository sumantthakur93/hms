import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    medicine: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    medicineBatch: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    prescription: {
      findUnique: vi.fn(),
    },
    prescriptionItem: {
      update: vi.fn(),
    },
    stockAdjustment: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) =>
      fn({
        medicineBatch: {
          findUnique: vi.fn(async () => ({ id: "b1", quantity: 100 })),
          update: vi.fn(),
        },
        prescriptionItem: {
          update: vi.fn(),
        },
      }),
    ),
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  getMedicines,
  createMedicine,
  updateMedicine,
  deactivateMedicine,
  addBatch,
  adjustStock,
  getLowStockMedicines,
  dispensePrescription,
  previewDispense,
} from "@/actions/pharmacy";

const mockAuth = vi.mocked(auth) as unknown as {
  mockReset(): void;
  mockResolvedValue(value: any): void;
};

function adminSession() {
  return {
    user: {
      id: "admin-id",
      role: "ADMIN" as const,
      name: "Admin",
      email: "admin@carepoint.in",
    },
    expires: new Date().toISOString(),
  } as any;
}

function receptionistSession() {
  return {
    user: {
      id: "rec-id",
      role: "RECEPTIONIST" as const,
      name: "Receptionist",
      email: "rec@carepoint.in",
    },
    expires: new Date().toISOString(),
  } as any;
}

function patientSession() {
  return {
    user: {
      id: "pat-id",
      role: "PATIENT" as const,
      name: "Patient",
      email: "pat@carepoint.in",
    },
    expires: new Date().toISOString(),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(null);
});

// ─── getMedicines ──────────────────────────────────────────────────────────────

describe("getMedicines", () => {
  it("returns medicines with stock calculations for admin", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicine.findMany).mockResolvedValue([
      {
        id: "m1",
        name: "Paracetamol",
        genericName: "Paracetamol",
        manufacturer: "Cipla",
        category: "Analgesic",
        unitPrice: 2.5,
        reorderLevel: 100,
        active: true,
        batches: [
          {
            id: "b1",
            expiryDate: new Date(Date.now() + 365 * 86400000),
            quantity: 200,
          },
        ],
      },
    ] as any);

    const result = await getMedicines();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.medicines).toHaveLength(1);
      expect(result.medicines[0].totalStock).toBe(200);
      expect(result.medicines[0].stockStatus).toBe("IN_STOCK");
    }
  });

  it("marks low stock when total ≤ reorder level", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicine.findMany).mockResolvedValue([
      {
        id: "m1",
        name: "Paracetamol",
        genericName: "Paracetamol",
        manufacturer: null,
        category: null,
        unitPrice: 2.5,
        reorderLevel: 100,
        active: true,
        batches: [
          {
            id: "b1",
            expiryDate: new Date(Date.now() + 365 * 86400000),
            quantity: 50,
          },
        ],
      },
    ] as any);

    const result = await getMedicines();
    if (result.ok) {
      expect(result.medicines[0].stockStatus).toBe("LOW_STOCK");
    }
  });

  it("marks out of stock when total = 0", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicine.findMany).mockResolvedValue([
      {
        id: "m1",
        name: "Paracetamol",
        genericName: "Paracetamol",
        manufacturer: null,
        category: null,
        unitPrice: 2.5,
        reorderLevel: 100,
        active: true,
        batches: [],
      },
    ] as any);

    const result = await getMedicines();
    if (result.ok) {
      expect(result.medicines[0].stockStatus).toBe("OUT_OF_STOCK");
    }
  });

  it("excludes expired batches from stock count", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicine.findMany).mockResolvedValue([
      {
        id: "m1",
        name: "Paracetamol",
        genericName: "Paracetamol",
        manufacturer: null,
        category: null,
        unitPrice: 2.5,
        reorderLevel: 100,
        active: true,
        batches: [
          {
            id: "b1",
            expiryDate: new Date(Date.now() - 86400000),
            quantity: 200,
          },
          {
            id: "b2",
            expiryDate: new Date(Date.now() + 365 * 86400000),
            quantity: 50,
          },
        ],
      },
    ] as any);

    const result = await getMedicines();
    if (result.ok) {
      expect(result.medicines[0].totalStock).toBe(50);
    }
  });

  it("filters to low stock only when flag set", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicine.findMany).mockResolvedValue([
      {
        id: "m1",
        name: "Paracetamol",
        genericName: "Paracetamol",
        manufacturer: null,
        category: null,
        unitPrice: 2.5,
        reorderLevel: 100,
        active: true,
        batches: [
          {
            id: "b1",
            expiryDate: new Date(Date.now() + 365 * 86400000),
            quantity: 200,
          },
        ],
      },
      {
        id: "m2",
        name: "Amoxicillin",
        genericName: "Amoxicillin",
        manufacturer: null,
        category: null,
        unitPrice: 5,
        reorderLevel: 50,
        active: true,
        batches: [
          {
            id: "b2",
            expiryDate: new Date(Date.now() + 365 * 86400000),
            quantity: 10,
          },
        ],
      },
    ] as any);

    const result = await getMedicines({ lowStockOnly: true });
    if (result.ok) {
      expect(result.medicines).toHaveLength(1);
      expect(result.medicines[0].name).toBe("Amoxicillin");
    }
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(getMedicines()).rejects.toThrow("Unauthorized");
  });
});

// ─── createMedicine ────────────────────────────────────────────────────────────

describe("createMedicine", () => {
  const validInput = {
    name: "Ibuprofen 400mg",
    genericName: "Ibuprofen",
    manufacturer: "Cipla",
    category: "NSAID",
    unitPrice: 3.5,
    reorderLevel: 80,
    active: true,
  };

  it("creates medicine for admin", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicine.create).mockResolvedValue({
      id: "m1",
      ...validInput,
    } as any);

    const result = await createMedicine(validInput);
    expect(result.ok).toBe(true);
    expect(prisma.medicine.create).toHaveBeenCalled();
  });

  it("rejects duplicate name (P2002)", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicine.create).mockRejectedValue({
      code: "P2002",
    } as any);

    const result = await createMedicine(validInput);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("already exists");
  });

  it("rejects invalid input", async () => {
    mockAuth.mockResolvedValue(adminSession());
    const result = await createMedicine({ ...validInput, name: "" });
    expect(result.ok).toBe(false);
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(createMedicine(validInput)).rejects.toThrow("Unauthorized");
  });
});

// ─── updateMedicine ────────────────────────────────────────────────────────────

describe("updateMedicine", () => {
  it("updates medicine for admin", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicine.update).mockResolvedValue({
      id: "m1",
      name: "Updated",
    } as any);

    const result = await updateMedicine("m1", { name: "Updated" });
    expect(result.ok).toBe(true);
  });

  it("rejects if not found (P2025)", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicine.update).mockRejectedValue({
      code: "P2025",
    } as any);

    const result = await updateMedicine("nonexistent", { name: "Updated" });
    expect(result.ok).toBe(false);
  });
});

// ─── deactivateMedicine ────────────────────────────────────────────────────────

describe("deactivateMedicine", () => {
  it("deactivates medicine for admin", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicine.update).mockResolvedValue({
      id: "m1",
      active: false,
    } as any);

    const result = await deactivateMedicine("m1");
    expect(result.ok).toBe(true);
    expect(prisma.medicine.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { active: false },
    });
  });
});

// ─── addBatch ──────────────────────────────────────────────────────────────────

describe("addBatch", () => {
  const validInput = {
    medicineId: "m1",
    batchNumber: "B-2024-001",
    expiryDate: "2025-12-31",
    quantity: 100,
  };

  it("creates batch for admin", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicine.findUnique).mockResolvedValue({
      id: "m1",
    } as any);
    vi.mocked(prisma.medicineBatch.create).mockResolvedValue({
      id: "b1",
    } as any);

    const result = await addBatch(validInput);
    expect(result.ok).toBe(true);
  });

  it("rejects if medicine not found", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicine.findUnique).mockResolvedValue(null);

    const result = await addBatch(validInput);
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate batch number (P2002)", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicine.findUnique).mockResolvedValue({
      id: "m1",
    } as any);
    vi.mocked(prisma.medicineBatch.create).mockRejectedValue({
      code: "P2002",
    } as any);

    const result = await addBatch(validInput);
    expect(result.ok).toBe(false);
  });
});

// ─── adjustStock ───────────────────────────────────────────────────────────────

describe("adjustStock", () => {
  const validInput = {
    batchId: "b1",
    newQty: 180,
    reason: "RECOUNT" as const,
    notes: "Annual count",
  };

  it("adjusts stock and logs for admin", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicineBatch.findUnique).mockResolvedValue({
      id: "b1",
      quantity: 200,
    } as any);
    vi.mocked(prisma.medicineBatch.update).mockResolvedValue({
      id: "b1",
      quantity: 180,
    } as any);
    vi.mocked(prisma.stockAdjustment.create).mockResolvedValue({
      id: "sa1",
    } as any);

    const result = await adjustStock(validInput);
    expect(result.ok).toBe(true);
    expect(prisma.stockAdjustment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          oldQty: 200,
          newQty: 180,
          reason: "RECOUNT",
        }),
      }),
    );
  });

  it("rejects if batch not found", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicineBatch.findUnique).mockResolvedValue(null);

    const result = await adjustStock(validInput);
    expect(result.ok).toBe(false);
  });
});

// ─── getLowStockMedicines ──────────────────────────────────────────────────────

describe("getLowStockMedicines", () => {
  it("returns medicines at or below reorder level", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.medicine.findMany).mockResolvedValue([
      {
        id: "m1",
        name: "Paracetamol",
        reorderLevel: 100,
        batches: [
          { expiryDate: new Date(Date.now() + 365 * 86400000), quantity: 200 },
        ],
      },
      {
        id: "m2",
        name: "Amoxicillin",
        reorderLevel: 50,
        batches: [
          { expiryDate: new Date(Date.now() + 365 * 86400000), quantity: 30 },
        ],
      },
    ] as any);

    const result = await getLowStockMedicines();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.medicines).toHaveLength(1);
      expect(result.medicines[0].name).toBe("Amoxicillin");
    }
  });
});

// ─── dispensePrescription ──────────────────────────────────────────────────────

describe("dispensePrescription", () => {
  it("dispenses prescription using FEFO for receptionist", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.prescription.findUnique).mockResolvedValue({
      id: "rx1",
      items: [{ id: "pi1", medicineId: "m1", quantity: 10, dispensed: false }],
    } as any);
    vi.mocked(prisma.medicineBatch.findMany).mockResolvedValue([
      {
        id: "b1",
        batchNumber: "B-001",
        expiryDate: new Date(Date.now() + 100 * 86400000),
        quantity: 50,
      },
    ] as any);
    vi.mocked(prisma.medicine.findUnique).mockResolvedValue({
      name: "Paracetamol",
    } as any);

    const result = await dispensePrescription({ prescriptionId: "rx1" });
    expect(result.ok).toBe(true);
  });

  it("rejects if prescription not found", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.prescription.findUnique).mockResolvedValue(null);

    const result = await dispensePrescription({
      prescriptionId: "nonexistent",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects if already fully dispensed", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.prescription.findUnique).mockResolvedValue({
      id: "rx1",
      items: [{ id: "pi1", medicineId: "m1", quantity: 10, dispensed: true }],
    } as any);

    const result = await dispensePrescription({ prescriptionId: "rx1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("already dispensed");
  });

  it("rejects if insufficient stock", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.prescription.findUnique).mockResolvedValue({
      id: "rx1",
      items: [{ id: "pi1", medicineId: "m1", quantity: 100, dispensed: false }],
    } as any);
    vi.mocked(prisma.medicineBatch.findMany).mockResolvedValue([
      {
        id: "b1",
        batchNumber: "B-001",
        expiryDate: new Date(Date.now() + 100 * 86400000),
        quantity: 10,
      },
    ] as any);
    vi.mocked(prisma.medicine.findUnique).mockResolvedValue({
      name: "Paracetamol",
    } as any);

    const result = await dispensePrescription({ prescriptionId: "rx1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Insufficient");
  });

  it("excludes expired batches from dispensing", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.prescription.findUnique).mockResolvedValue({
      id: "rx1",
      items: [{ id: "pi1", medicineId: "m1", quantity: 50, dispensed: false }],
    } as any);
    // Only expired batch with enough stock — should fail
    vi.mocked(prisma.medicineBatch.findMany).mockResolvedValue([
      {
        id: "b1",
        batchNumber: "B-001",
        expiryDate: new Date(Date.now() - 86400000),
        quantity: 100,
      },
    ] as any);
    vi.mocked(prisma.medicine.findUnique).mockResolvedValue({
      name: "Paracetamol",
    } as any);

    const result = await dispensePrescription({ prescriptionId: "rx1" });
    expect(result.ok).toBe(false);
  });

  it("rejects non-admin/receptionist", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(
      dispensePrescription({ prescriptionId: "rx1" }),
    ).rejects.toThrow("Unauthorized");
  });
});

// ─── previewDispense ───────────────────────────────────────────────────────────

describe("previewDispense", () => {
  it("returns dispense plan without executing", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.prescription.findUnique).mockResolvedValue({
      id: "rx1",
      items: [
        {
          id: "pi1",
          medicineId: "m1",
          quantity: 10,
          dispensed: false,
          medicine: { name: "Paracetamol" },
        },
      ],
    } as any);
    vi.mocked(prisma.medicineBatch.findMany).mockResolvedValue([
      {
        id: "b1",
        batchNumber: "B-001",
        expiryDate: new Date(Date.now() + 100 * 86400000),
        quantity: 50,
      },
    ] as any);

    const result = await previewDispense("rx1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan).toHaveLength(1);
      expect(result.plan[0].allocations).toHaveLength(1);
      expect(result.plan[0].allocations[0].qty).toBe(10);
    }
  });
});
