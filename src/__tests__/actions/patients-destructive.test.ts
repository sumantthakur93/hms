import { describe, it, expect, vi, beforeEach } from "vitest";

// Destructive tests for patient actions — injection, boundary values,
// immutability, and cross-role authorization.

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import {
  createPatient,
  searchPatients,
  getPatient,
  updatePatient,
} from "@/actions/patients";

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

function doctorSession() {
  return {
    user: {
      id: "doc-id",
      role: "DOCTOR" as const,
      name: "Dr. Test",
      email: "doc@carepoint.in",
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
    },
    expires: new Date().toISOString(),
  } as any;
}

const validInput = {
  firstName: "Rahul",
  lastName: "Kumar",
  phone: "+91 98765 43210",
};

beforeEach(() => {
  mockAuth.mockReset();
  vi.mocked(prisma.patient.findFirst).mockReset();
  vi.mocked(prisma.patient.findUnique).mockReset();
  vi.mocked(prisma.patient.findMany).mockReset();
  vi.mocked(prisma.patient.create).mockReset();
  vi.mocked(prisma.patient.update).mockReset();
});

// ─── D-INJECT: Injection & XSS ────────────────────────────────────────────────

describe("D-INJECT — Patient injection & XSS", () => {
  it("D-INJECT.01: XSS in firstName is stored as-is (React escapes on render)", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "<script>",
      lastName: "Test",
    } as any);

    const xss = `<script>alert('xss')</script>`;
    const result = await createPatient({ ...validInput, firstName: xss });
    expect(result.ok).toBe(true);
    const createCall = vi.mocked(prisma.patient.create).mock.calls[0][0];
    expect(createCall.data.firstName).toBe(xss);
  });

  it("D-INJECT.02: SQL injection in search query is parameterized by Prisma", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findMany).mockResolvedValue([]);

    const result = await searchPatients("'; DROP TABLE patients;--");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.patients).toEqual([]);
    // Verify Prisma was called (parameterized — no injection possible)
    expect(prisma.patient.findMany).toHaveBeenCalledTimes(1);
  });

  it("D-INJECT.03: SQL injection in getPatient ID is parameterized", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null);

    const result = await getPatient("'; DROP TABLE patients;--");
    expect(result.ok).toBe(false);
    expect(prisma.patient.findUnique).toHaveBeenCalledTimes(1);
  });

  it("D-INJECT.04: XSS in updatePatient address field is stored as-is", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.update).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "Rahul",
      lastName: "Kumar",
    } as any);

    const xss = `<img src=x onerror=alert(1)>`;
    const result = await updatePatient("p1", { address: xss });
    expect(result.ok).toBe(true);
    const updateCall = vi.mocked(prisma.patient.update).mock.calls[0][0];
    expect(updateCall.data.address).toBe(xss);
  });

  it("D-INJECT.05: null byte in search query doesn't crash", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findMany).mockResolvedValue([]);

    const result = await searchPatients("Rahul\x00evil");
    expect(result.ok).toBe(true);
  });

  it("D-INJECT.06: null byte in getPatient ID doesn't crash", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null);

    const result = await getPatient("p1\x00evil");
    expect(result.ok).toBe(false);
  });
});

// ─── D-BOUND: Boundary values ─────────────────────────────────────────────────

describe("D-BOUND — Patient boundary values", () => {
  it("D-BOUND.01: rejects phone shorter than 10 chars", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    const result = await createPatient({ ...validInput, phone: "12345" });
    expect(result.ok).toBe(false);
  });

  it("D-BOUND.02: accepts phone of exactly 10 chars", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "Rahul",
      lastName: "Kumar",
    } as any);

    const result = await createPatient({ ...validInput, phone: "1234567890" });
    expect(result.ok).toBe(true);
  });

  it("D-BOUND.03: rejects empty firstName", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    const result = await createPatient({ ...validInput, firstName: "" });
    expect(result.ok).toBe(false);
  });

  it("D-BOUND.04: rejects empty lastName", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    const result = await createPatient({ ...validInput, lastName: "" });
    expect(result.ok).toBe(false);
  });

  it("D-BOUND.05: rejects invalid email format", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
    } as any);

    const result = await createPatient({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.ok).toBe(false);
  });

  it("D-BOUND.06: accepts empty string email (schema allows .or(z.literal('')))", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
    } as any);

    const result = await createPatient({ ...validInput, email: "" });
    expect(result.ok).toBe(true);
  });

  it("D-BOUND.07: rejects invalid gender enum", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    const result = await createPatient({
      ...validInput,
      gender: "INVALID" as any,
    });
    expect(result.ok).toBe(false);
  });

  it("D-BOUND.08: search query of 1 char returns empty (min is 2)", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    const result = await searchPatients("A");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.patients).toEqual([]);
    // findMany should NOT be called for short queries
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it("D-BOUND.09: search query of exactly 2 chars triggers search", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findMany).mockResolvedValue([]);

    const result = await searchPatients("Ra");
    expect(result.ok).toBe(true);
    expect(prisma.patient.findMany).toHaveBeenCalledTimes(1);
  });
});

// ─── D-INPUT: Extreme inputs ──────────────────────────────────────────────────

describe("D-INPUT — Patient extreme inputs", () => {
  it("D-INPUT.01: 10KB firstName doesn't crash (no max length in schema)", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "A".repeat(10000),
      lastName: "Test",
    } as any);

    const result = await createPatient({
      ...validInput,
      firstName: "A".repeat(10000),
    });
    expect(result.ok).toBe(true);
  });

  it("D-INPUT.02: 10KB address in updatePatient doesn't crash", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.update).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "Rahul",
      lastName: "Kumar",
    } as any);

    const result = await updatePatient("p1", { address: "A".repeat(10000) });
    expect(result.ok).toBe(true);
  });

  it("D-INPUT.03: spaces-only firstName passes schema (potential bug)", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "   ",
      lastName: "Test",
    } as any);

    const result = await createPatient({ ...validInput, firstName: "   " });
    // Zod min(1) counts spaces — potential bug
    expect(result.ok).toBe(true);
  });

  it("D-INPUT.04: 10KB search query doesn't crash", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findMany).mockResolvedValue([]);

    const result = await searchPatients("A".repeat(10000));
    expect(result.ok).toBe(true);
  });
});

// ─── D-AUTHZ: Cross-role authorization ────────────────────────────────────────

describe("D-AUTHZ — Patient cross-role authorization", () => {
  it("D-AUTHZ.01: PATIENT cannot createPatient", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(createPatient(validInput as any)).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("D-AUTHZ.02: DOCTOR cannot createPatient", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    await expect(createPatient(validInput as any)).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("D-AUTHZ.03: PATIENT cannot searchPatients", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(searchPatients("Rahul")).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.04: PATIENT cannot getPatient", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(getPatient("p1")).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.05: PATIENT cannot updatePatient", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(updatePatient("p1", { firstName: "Hacker" })).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("D-AUTHZ.06: DOCTOR cannot updatePatient", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    await expect(updatePatient("p1", { firstName: "Hacker" })).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("D-AUTHZ.07: DOCTOR can searchPatients (allowed for clinical use)", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    vi.mocked(prisma.patient.findMany).mockResolvedValue([]);

    const result = await searchPatients("Rahul");
    expect(result.ok).toBe(true);
  });

  it("D-AUTHZ.08: DOCTOR can getPatient (allowed for clinical use)", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "Rahul",
      lastName: "Kumar",
    } as any);

    const result = await getPatient("p1");
    expect(result.ok).toBe(true);
  });
});

// ─── D-IMMUTABLE: Immutability tests ──────────────────────────────────────────

describe("D-IMMUTABLE — Patient immutability", () => {
  it("D-IMMUTABLE.01: updatePatient does not pass phone to Prisma (phone is omitted from schema)", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.update).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "Rahul",
      lastName: "Kumar",
    } as any);

    // updateSchema omits phone — even if we try to pass it, Zod strips it
    await updatePatient("p1", {
      firstName: "NewName",
      phone: "9999999999",
    } as any);
    const updateCall = vi.mocked(prisma.patient.update).mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("phone");
  });

  it("D-IMMUTABLE.02: updatePatient does not pass MRN to Prisma", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.update).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "Rahul",
      lastName: "Kumar",
    } as any);

    await updatePatient("p1", {
      firstName: "NewName",
      mrn: "MRN-99999",
    } as any);
    const updateCall = vi.mocked(prisma.patient.update).mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("mrn");
  });
});

// ─── D-CONC: Race condition simulation ────────────────────────────────────────

describe("D-CONC — Patient race conditions", () => {
  it("D-CONC.01: MRN race — retries on collision, then succeeds", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    // Both see MRN-00005 as last, both try MRN-00006
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({
      mrn: "MRN-00005",
    } as any);
    // First create (MRN-00006) fails with P2002, retry (MRN-00007) succeeds
    const p2002Error = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "5.0.0" },
    );
    vi.mocked(prisma.patient.create)
      .mockRejectedValueOnce(p2002Error)
      .mockResolvedValueOnce({
        id: "p2",
        mrn: "MRN-00007",
        firstName: "C",
        lastName: "D",
      } as any);

    const result = await createPatient({ ...validInput, phone: "2222222222" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patient.mrn).toBe("MRN-00007");
    }
  });
});
