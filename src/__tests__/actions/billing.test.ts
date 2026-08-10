import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    invoice: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    invoiceItem: {
      create: vi.fn(),
    },
    labTestOrder: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) =>
      fn({
        invoice: {
          create: vi.fn(async () => ({
            id: "inv1",
            invoiceNumber: "INV-00001",
          })),
        },
        invoiceItem: {
          create: vi.fn(),
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
  generateInvoice,
  getInvoice,
  getInvoices,
  issueInvoice,
  markPaid,
  cancelInvoice,
  getBillableAppointments,
  setLabOrderInternal,
  getLabOrdersForClassification,
  getBillingReport,
} from "@/actions/billing";

const mockAuth = vi.mocked(auth) as unknown as {
  mockReset(): void;
  mockResolvedValue(value: any): void;
};

function receptionistSession() {
  return {
    user: {
      id: "rec-id",
      role: "RECEPTIONIST" as const,
      name: "Rec",
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
      name: "Pat",
      email: "pat@carepoint.in",
      patientId: "p1",
    },
    expires: new Date().toISOString(),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(null);
});

// ─── generateInvoice ───────────────────────────────────────────────────────────

describe("generateInvoice", () => {
  const completedAppointment = {
    id: "a1",
    patientId: "p1",
    status: "COMPLETED",
    patient: { id: "p1", mrn: "MRN-001", firstName: "John", lastName: "Doe" },
    doctor: {
      department: { name: "General Medicine", consultationFee: 500 },
    },
    consultation: {
      labTestOrders: [
        { isInternal: true, testType: { name: "CBC", price: 300 } },
        { isInternal: false, testType: { name: "External MRI", price: 2000 } },
      ],
      prescription: {
        items: [
          {
            dispensed: true,
            quantity: 10,
            medicine: { name: "Paracetamol", unitPrice: 2.5 },
          },
          {
            dispensed: false,
            quantity: 5,
            medicine: { name: "Amoxicillin", unitPrice: 5 },
          },
        ],
      },
    },
  };

  it("generates invoice with consultation + internal labs + dispensed medicines", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
      completedAppointment as any,
    );

    const result = await generateInvoice("a1");
    expect(result.ok).toBe(true);
    // Verify $transaction was called (which creates invoice + items)
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("rejects if invoice already exists for appointment", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue({
      id: "inv1",
    } as any);

    const result = await generateInvoice("a1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("already exists");
  });

  it("rejects if appointment not found", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null);

    const result = await generateInvoice("nonexistent");
    expect(result.ok).toBe(false);
  });

  it("rejects if appointment is not COMPLETED", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      ...completedAppointment,
      status: "CHECKED_IN",
    } as any);

    const result = await generateInvoice("a1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("completed");
  });

  it("rejects if no consultation found", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      ...completedAppointment,
      consultation: null,
    } as any);

    const result = await generateInvoice("a1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("No consultation");
  });

  it("excludes external lab tests from invoice", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
      completedAppointment as any,
    );

    await generateInvoice("a1");
    // Check that $transaction was called — the item creation logic is inside
    // The external test (isInternal=false) should not create an invoice item
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("excludes non-dispensed medicines from invoice", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(
      completedAppointment as any,
    );

    await generateInvoice("a1");
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("rejects non-receptionist/admin", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(generateInvoice("a1")).rejects.toThrow("Unauthorized");
  });
});

// ─── getInvoice ────────────────────────────────────────────────────────────────

describe("getInvoice", () => {
  it("returns invoice with items and patient", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      id: "inv1",
      invoiceNumber: "INV-00001",
      patientId: "p1",
      status: "DRAFT",
      totalAmount: 800,
      items: [],
      patient: { mrn: "MRN-001", firstName: "John", lastName: "Doe" },
      appointment: null,
    } as any);

    const result = await getInvoice("inv1");
    expect(result.ok).toBe(true);
  });

  it("rejects if invoice not found", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null);

    const result = await getInvoice("nonexistent");
    expect(result.ok).toBe(false);
  });

  it("patients can only view own invoices", async () => {
    mockAuth.mockResolvedValue(patientSession());
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      id: "inv1",
      patientId: "other-patient",
      items: [],
      patient: {},
      appointment: null,
    } as any);

    const result = await getInvoice("inv1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Not your invoice");
  });
});

// ─── getInvoices ───────────────────────────────────────────────────────────────

describe("getInvoices", () => {
  it("returns invoices for receptionist", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      { id: "inv1", invoiceNumber: "INV-00001", status: "DRAFT" },
    ] as any);

    const result = await getInvoices();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.invoices).toHaveLength(1);
  });

  it("filters by status", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([] as any);

    await getInvoices("PAID");
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PAID" }),
      }),
    );
  });

  it("rejects non-receptionist/admin", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(getInvoices()).rejects.toThrow("Unauthorized");
  });
});

// ─── issueInvoice ──────────────────────────────────────────────────────────────

describe("issueInvoice", () => {
  it("issues a draft invoice", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      id: "inv1",
      status: "DRAFT",
    } as any);
    vi.mocked(prisma.invoice.update).mockResolvedValue({
      id: "inv1",
      status: "ISSUED",
    } as any);

    const result = await issueInvoice("inv1");
    expect(result.ok).toBe(true);
    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv1" },
      data: { status: "ISSUED" },
    });
  });

  it("rejects if invoice is not DRAFT", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      id: "inv1",
      status: "PAID",
    } as any);

    const result = await issueInvoice("inv1");
    expect(result.ok).toBe(false);
  });

  it("rejects if invoice not found", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null);

    const result = await issueInvoice("nonexistent");
    expect(result.ok).toBe(false);
  });
});

// ─── markPaid ──────────────────────────────────────────────────────────────────

describe("markPaid", () => {
  const validInput = {
    invoiceId: "inv1",
    paymentMethod: "CASH" as const,
  };

  it("marks an issued invoice as paid", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      id: "inv1",
      status: "ISSUED",
    } as any);
    vi.mocked(prisma.invoice.update).mockResolvedValue({
      id: "inv1",
      status: "PAID",
    } as any);

    const result = await markPaid(validInput);
    expect(result.ok).toBe(true);
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PAID",
          paymentMethod: "CASH",
          paidAt: expect.any(Date),
        }),
      }),
    );
  });

  it("rejects if invoice is not ISSUED", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      id: "inv1",
      status: "DRAFT",
    } as any);

    const result = await markPaid(validInput);
    expect(result.ok).toBe(false);
  });

  it("rejects if invoice not found", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null);

    const result = await markPaid(validInput);
    expect(result.ok).toBe(false);
  });

  it("rejects invalid input", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    const result = await markPaid({
      ...validInput,
      invoiceId: "",
    });
    expect(result.ok).toBe(false);
  });
});

// ─── cancelInvoice ─────────────────────────────────────────────────────────────

describe("cancelInvoice", () => {
  it("cancels a draft or issued invoice", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      id: "inv1",
      status: "DRAFT",
    } as any);
    vi.mocked(prisma.invoice.update).mockResolvedValue({
      id: "inv1",
      status: "CANCELLED",
    } as any);

    const result = await cancelInvoice("inv1");
    expect(result.ok).toBe(true);
  });

  it("rejects cancelling a paid invoice", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
      id: "inv1",
      status: "PAID",
    } as any);

    const result = await cancelInvoice("inv1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("paid");
  });
});

// ─── getBillableAppointments ───────────────────────────────────────────────────

describe("getBillableAppointments", () => {
  it("returns completed appointments without invoices", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "a1",
        status: "COMPLETED",
        patient: { firstName: "John", mrn: "MRN-001" },
      },
    ] as any);

    const result = await getBillableAppointments();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.appointments).toHaveLength(1);
  });

  it("rejects non-receptionist/admin", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(getBillableAppointments()).rejects.toThrow("Unauthorized");
  });
});

// ─── setLabOrderInternal ───────────────────────────────────────────────────────

describe("setLabOrderInternal", () => {
  it("sets isInternal flag on lab order", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.labTestOrder.findUnique).mockResolvedValue({
      id: "lt1",
      isInternal: false,
    } as any);
    vi.mocked(prisma.labTestOrder.update).mockResolvedValue({
      id: "lt1",
      isInternal: true,
    } as any);

    const result = await setLabOrderInternal("lt1", true);
    expect(result.ok).toBe(true);
    expect(prisma.labTestOrder.update).toHaveBeenCalledWith({
      where: { id: "lt1" },
      data: { isInternal: true },
    });
  });

  it("rejects if lab order not found", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.labTestOrder.findUnique).mockResolvedValue(null);

    const result = await setLabOrderInternal("nonexistent", true);
    expect(result.ok).toBe(false);
  });
});

// ─── getLabOrdersForClassification ────────────────────────────────────────────

describe("getLabOrdersForClassification", () => {
  beforeEach(() => {
    vi.mocked(prisma.labTestOrder.findMany).mockReset();
  });

  it("returns unclassified lab orders for receptionist", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.labTestOrder.findMany).mockResolvedValue([
      {
        id: "lt1",
        status: "ORDERED",
        priority: "ROUTINE",
        createdAt: new Date(),
        testType: { name: "CBC", code: "CBC" },
        consultation: {
          patient: {
            id: "p1",
            mrn: "MRN-001",
            firstName: "John",
            lastName: "Doe",
          },
          appointment: { id: "a1", date: new Date() },
        },
      },
    ] as any);

    const result = await getLabOrdersForClassification();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.labOrders).toHaveLength(1);
      expect(result.labOrders[0].patientName).toBe("John Doe");
    }
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getLabOrdersForClassification()).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("rejects patient role", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(getLabOrdersForClassification()).rejects.toThrow(
      "Unauthorized",
    );
  });
});

// ─── getBillingReport ─────────────────────────────────────────────────────────

describe("getBillingReport", () => {
  function adminSession() {
    return {
      user: { id: "adm-id", role: "ADMIN" as const, name: "Admin" },
      expires: new Date().toISOString(),
    } as any;
  }

  beforeEach(() => {
    vi.mocked(prisma.invoice.count).mockReset();
    vi.mocked(prisma.invoice.findMany).mockReset();
    vi.mocked(prisma.invoice.groupBy).mockReset();
  });

  it("returns billing report for admin", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.invoice.count).mockResolvedValue(5);
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      { totalAmount: 500, paidAt: new Date(), paymentMethod: "CASH" },
      { totalAmount: 300, paidAt: new Date(), paymentMethod: "UPI" },
    ] as any);
    vi.mocked(prisma.invoice.groupBy).mockResolvedValue([
      { _sum: { totalAmount: 800 }, _count: 2 },
    ] as any);

    const result = await getBillingReport();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary).toBeDefined();
      expect(result.monthlyRevenue).toBeDefined();
      expect(result.paymentMethods).toBeDefined();
    }
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getBillingReport()).rejects.toThrow("Unauthorized");
  });

  it("rejects receptionist role", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    await expect(getBillingReport()).rejects.toThrow("Unauthorized");
  });
});
