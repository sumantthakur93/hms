import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    labTestOrder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    labResult: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  getLabQueue,
  getLabOrder,
  collectSample,
  saveDraftResults,
  submitResults,
  getCompletedTests,
} from "@/actions/lab";

const mockAuth = vi.mocked(auth) as unknown as {
  mockReset(): void;
  mockResolvedValue(value: any): void;
};

function labSession() {
  return {
    user: {
      id: "lab-user-id",
      role: "LAB_TECHNICIAN" as const,
      name: "Test Lab Tech",
      email: "test-lab@carepoint.in",
    },
    expires: new Date().toISOString(),
  } as any;
}

function doctorSession() {
  return {
    user: {
      id: "doc-user-id",
      role: "DOCTOR" as const,
      name: "Dr. Test",
      email: "test-doctor@carepoint.in",
      profileId: "doc1",
    },
    expires: new Date().toISOString(),
  } as any;
}

function patientSession() {
  return {
    user: {
      id: "pat-user-id",
      role: "PATIENT" as const,
      name: "Test Patient",
      email: "test-patient@carepoint.in",
      patientId: "p1",
    },
    expires: new Date().toISOString(),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(null);
});

// ─── getLabQueue ───────────────────────────────────────────────────────────────

describe("getLabQueue", () => {
  it("returns queue with stats for lab tech", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findMany)
      .mockResolvedValueOnce([
        {
          id: "lt1",
          status: "ORDERED",
          priority: "URGENT",
          isInternal: true,
          patient: { firstName: "John", mrn: "MRN-00001" },
          testType: { name: "CBC" },
          result: null,
        },
      ] as any)
      .mockResolvedValueOnce([
        { status: "ORDERED", createdAt: new Date() },
        { status: "PROCESSING", createdAt: new Date() },
        { status: "COMPLETED", createdAt: new Date() },
      ] as any);

    const result = await getLabQueue();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.orders).toHaveLength(1);
      expect(result.stats).toBeDefined();
    }
  });

  it("filters by status when provided", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findMany)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    await getLabQueue("ORDERED");
    expect(prisma.labTestOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ORDERED" }),
      }),
    );
  });

  it("only returns internal orders", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findMany)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    await getLabQueue();
    expect(prisma.labTestOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isInternal: true }),
      }),
    );
  });

  it("rejects non-lab roles", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(getLabQueue()).rejects.toThrow("Unauthorized");
  });
});

// ─── getLabOrder ───────────────────────────────────────────────────────────────

describe("getLabOrder", () => {
  it("returns order with patient and test type", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findUnique).mockResolvedValue({
      id: "lt1",
      status: "ORDERED",
      patient: { firstName: "John", mrn: "MRN-00001" },
      testType: { name: "CBC" },
      result: null,
    } as any);

    const result = await getLabOrder("lt1");
    expect(result.ok).toBe(true);
  });

  it("rejects if order not found", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findUnique).mockResolvedValue(null);

    const result = await getLabOrder("nonexistent");
    expect(result.ok).toBe(false);
  });

  it("allows doctors to view", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    vi.mocked(prisma.labTestOrder.findUnique).mockResolvedValue({
      id: "lt1",
      status: "COMPLETED",
    } as any);

    const result = await getLabOrder("lt1");
    expect(result.ok).toBe(true);
  });
});

// ─── collectSample ─────────────────────────────────────────────────────────────

describe("collectSample", () => {
  it("collects sample for ORDERED test", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findUnique).mockResolvedValue({
      id: "lt1",
      status: "ORDERED",
    } as any);
    vi.mocked(prisma.labTestOrder.update).mockResolvedValue({
      id: "lt1",
      status: "SAMPLE_COLLECTED",
    } as any);

    const result = await collectSample("lt1");
    expect(result.ok).toBe(true);
    expect(prisma.labTestOrder.update).toHaveBeenCalledWith({
      where: { id: "lt1" },
      data: { status: "SAMPLE_COLLECTED" },
    });
  });

  it("rejects if test is not ORDERED", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findUnique).mockResolvedValue({
      id: "lt1",
      status: "COMPLETED",
    } as any);

    const result = await collectSample("lt1");
    expect(result.ok).toBe(false);
  });

  it("rejects if order not found", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findUnique).mockResolvedValue(null);

    const result = await collectSample("nonexistent");
    expect(result.ok).toBe(false);
  });

  it("rejects non-lab roles", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(collectSample("lt1")).rejects.toThrow("Unauthorized");
  });
});

// ─── saveDraftResults ──────────────────────────────────────────────────────────

describe("saveDraftResults", () => {
  const validInput = {
    labTestOrderId: "lt1",
    results: [
      { parameter: "Hemoglobin", value: "14.5", unit: "g/dL", referenceRange: "13-17" },
    ],
    notes: "Normal results",
  };

  it("creates result and sets PROCESSING", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findUnique).mockResolvedValue({
      id: "lt1",
      status: "SAMPLE_COLLECTED",
      result: null,
    } as any);
    vi.mocked(prisma.labResult.create).mockResolvedValue({ id: "lr1" } as any);
    vi.mocked(prisma.labTestOrder.update).mockResolvedValue({
      id: "lt1",
      status: "PROCESSING",
    } as any);

    const result = await saveDraftResults(validInput);
    expect(result.ok).toBe(true);
    expect(prisma.labResult.create).toHaveBeenCalled();
    expect(prisma.labTestOrder.update).toHaveBeenCalledWith({
      where: { id: "lt1" },
      data: { status: "PROCESSING" },
    });
  });

  it("updates existing result", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findUnique).mockResolvedValue({
      id: "lt1",
      status: "PROCESSING",
      result: { id: "lr1" },
    } as any);
    vi.mocked(prisma.labResult.update).mockResolvedValue({ id: "lr1" } as any);
    vi.mocked(prisma.labTestOrder.update).mockResolvedValue({
      id: "lt1",
      status: "PROCESSING",
    } as any);

    const result = await saveDraftResults(validInput);
    expect(result.ok).toBe(true);
    expect(prisma.labResult.update).toHaveBeenCalled();
    expect(prisma.labResult.create).not.toHaveBeenCalled();
  });

  it("rejects if test is not SAMPLE_COLLECTED or PROCESSING", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findUnique).mockResolvedValue({
      id: "lt1",
      status: "ORDERED",
      result: null,
    } as any);

    const result = await saveDraftResults(validInput);
    expect(result.ok).toBe(false);
  });

  it("rejects if order not found", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findUnique).mockResolvedValue(null);

    const result = await saveDraftResults(validInput);
    expect(result.ok).toBe(false);
  });

  it("rejects invalid input", async () => {
    mockAuth.mockResolvedValue(labSession());
    const result = await saveDraftResults({
      ...validInput,
      labTestOrderId: "",
    });
    expect(result.ok).toBe(false);
  });
});

// ─── submitResults ─────────────────────────────────────────────────────────────

describe("submitResults", () => {
  const validInput = {
    labTestOrderId: "lt1",
    results: [
      { parameter: "Hemoglobin", value: "14.5", unit: "g/dL", referenceRange: "13-17" },
    ],
    notes: "Normal results",
  };

  it("submits results and sets COMPLETED", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findUnique).mockResolvedValue({
      id: "lt1",
      status: "PROCESSING",
      result: { id: "lr1" },
    } as any);
    vi.mocked(prisma.labResult.update).mockResolvedValue({ id: "lr1" } as any);
    vi.mocked(prisma.labTestOrder.update).mockResolvedValue({
      id: "lt1",
      status: "COMPLETED",
    } as any);

    const result = await submitResults(validInput);
    expect(result.ok).toBe(true);
    expect(prisma.labTestOrder.update).toHaveBeenCalledWith({
      where: { id: "lt1" },
      data: { status: "COMPLETED" },
    });
  });

  it("rejects empty results array", async () => {
    mockAuth.mockResolvedValue(labSession());
    const result = await submitResults({
      ...validInput,
      results: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("At least one");
  });

  it("rejects if test is COMPLETED", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findUnique).mockResolvedValue({
      id: "lt1",
      status: "COMPLETED",
      result: { id: "lr1" },
    } as any);

    const result = await submitResults(validInput);
    expect(result.ok).toBe(false);
  });

  it("rejects non-lab roles", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(submitResults(validInput)).rejects.toThrow("Unauthorized");
  });
});

// ─── getCompletedTests ─────────────────────────────────────────────────────────

describe("getCompletedTests", () => {
  it("returns completed tests for lab tech", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.findMany).mockResolvedValue([
      {
        id: "lt1",
        status: "COMPLETED",
        patient: { firstName: "John" },
        testType: { name: "CBC" },
        result: { results: [] },
      },
    ] as any);

    const result = await getCompletedTests();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.orders).toHaveLength(1);
  });

  it("rejects non-lab roles", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(getCompletedTests()).rejects.toThrow("Unauthorized");
  });
});
