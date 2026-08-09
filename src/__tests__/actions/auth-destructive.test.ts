import { describe, it, expect, vi, beforeEach } from "vitest";

// Destructive tests for auth actions — XSS, injection, boundary values,
// and edge cases in signup and duplicate phone check.

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    patient: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn(async (pw: string) => `hashed-${pw}`),
}));

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signupPatient, checkDuplicatePhone } from "@/actions/auth";

const validInput = {
  firstName: "John",
  lastName: "Doe",
  phone: "+91 99999 99999",
  email: "john.doe@example.com",
  password: "secret123",
};

beforeEach(() => {
  vi.mocked(prisma.user.findUnique).mockReset();
  vi.mocked(prisma.user.create).mockReset();
  vi.mocked(prisma.patient.findFirst).mockReset();
  vi.mocked(hashPassword).mockReset();
});

// ─── D-INJECT: Injection & XSS ────────────────────────────────────────────────

describe("D-INJECT — Auth injection & XSS", () => {
  it("D-INJECT.01: XSS in firstName is stored as-is (React escapes on render)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed-pw");
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      patient: { mrn: "MRN-00001", id: "p1" },
    } as any);

    const xssName = `<script>alert('xss')</script>`;
    const result = await signupPatient({ ...validInput, firstName: xssName });

    expect(result.ok).toBe(true);
    const createCall = vi.mocked(prisma.user.create).mock.calls[0][0] as any;
    // The name field combines firstName + lastName — verify XSS is preserved
    expect(createCall.data.name).toContain(xssName);
    expect(createCall.data.patient.create.firstName).toBe(xssName);
  });

  it("D-INJECT.02: SQL injection in email is parameterized by Prisma", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed-pw");
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      patient: { mrn: "MRN-00001", id: "p1" },
    } as any);

    // Zod email() validation will reject this
    const result = await signupPatient({
      ...validInput,
      email: "john.doe@example.com'; DROP TABLE users;--",
    });
    expect(result.ok).toBe(false);
  });

  it("D-INJECT.03: null byte in email is rejected by Zod email validation", async () => {
    const result = await signupPatient({
      ...validInput,
      email: "john.doe@example.com\x00evil@test.in",
    });
    expect(result.ok).toBe(false);
  });

  it("D-INJECT.04: checkDuplicatePhone with SQL injection doesn't crash", async () => {
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    const result = await checkDuplicatePhone("98765'; DROP TABLE patients;--");
    // Prisma parameterizes — no injection. Returns duplicate=false.
    expect(result.duplicate).toBe(false);
  });

  it("D-INJECT.05: checkDuplicatePhone with null byte doesn't crash", async () => {
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    const result = await checkDuplicatePhone("98765\x00evil");
    expect(result).toBeDefined();
    expect(result.duplicate).toBe(false);
  });
});

// ─── D-BOUND: Boundary values ─────────────────────────────────────────────────

describe("D-BOUND — Auth boundary values", () => {
  it("D-BOUND.01: rejects password of exactly 5 chars (min is 6)", async () => {
    const result = await signupPatient({ ...validInput, password: "12345" });
    expect(result.ok).toBe(false);
  });

  it("D-BOUND.02: accepts password of exactly 6 chars (boundary)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed-pw");
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      patient: { mrn: "MRN-00001", id: "p1" },
    } as any);

    const result = await signupPatient({ ...validInput, password: "123456" });
    expect(result.ok).toBe(true);
  });

  it("D-BOUND.03: rejects phone shorter than 10 chars", async () => {
    const result = await signupPatient({ ...validInput, phone: "12345" });
    expect(result.ok).toBe(false);
  });

  it("D-BOUND.04: accepts phone of exactly 10 chars (boundary)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed-pw");
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      patient: { mrn: "MRN-00001", id: "p1" },
    } as any);

    const result = await signupPatient({ ...validInput, phone: "1234567890" });
    expect(result.ok).toBe(true);
  });

  it("D-BOUND.05: rejects invalid email format", async () => {
    const result = await signupPatient({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.ok).toBe(false);
  });

  it("D-BOUND.06: rejects empty email", async () => {
    const result = await signupPatient({ ...validInput, email: "" });
    expect(result.ok).toBe(false);
  });

  it("D-BOUND.07: rejects invalid gender enum value", async () => {
    const result = await signupPatient({
      ...validInput,
      gender: "ATTACK" as any,
    });
    expect(result.ok).toBe(false);
  });

  it("D-BOUND.08: accepts all valid gender values", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed-pw");
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      patient: { mrn: "MRN-00001", id: "p1" },
    } as any);

    for (const gender of ["MALE", "FEMALE", "OTHER"] as const) {
      vi.mocked(prisma.user.create).mockClear();
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      const result = await signupPatient({ ...validInput, gender });
      expect(result.ok).toBe(true);
    }
  });
});

// ─── D-INPUT: Extreme inputs ──────────────────────────────────────────────────

describe("D-INPUT — Auth extreme inputs", () => {
  it("D-INPUT.01: 10KB firstName doesn't crash (no max length on schema)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed-pw");
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      patient: { mrn: "MRN-00001", id: "p1" },
    } as any);

    const result = await signupPatient({
      ...validInput,
      firstName: "A".repeat(10000),
    });
    // Zod only has min(1), no max — so this passes. Potential DB overflow.
    expect(result.ok).toBe(true);
  });

  it("D-INPUT.02: 10KB password doesn't crash", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed-pw");
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      patient: { mrn: "MRN-00001", id: "p1" },
    } as any);

    const result = await signupPatient({
      ...validInput,
      password: "A".repeat(10000),
    });
    expect(result.ok).toBe(true);
  });

  it("D-INPUT.03: spaces-only password (6 spaces) passes schema (potential bug)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed-pw");
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      patient: { mrn: "MRN-00001", id: "p1" },
    } as any);

    const result = await signupPatient({
      ...validInput,
      password: "      ", // 6 spaces
    });
    // Zod min(6) counts spaces — this is a potential bug (no .trim() check)
    expect(result.ok).toBe(true);
  });

  it("D-INPUT.04: whitespace-only firstName passes schema (potential bug)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed-pw");
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      patient: { mrn: "MRN-00001", id: "p1" },
    } as any);

    const result = await signupPatient({
      ...validInput,
      firstName: "   ", // 3 spaces
    });
    // Zod min(1) counts spaces — this is a potential bug (no .trim() check)
    expect(result.ok).toBe(true);
  });

  it("D-INPUT.05: checkDuplicatePhone with empty string returns duplicate=false", async () => {
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    const result = await checkDuplicatePhone("");
    expect(result.duplicate).toBe(false);
  });

  it("D-INPUT.06: checkDuplicatePhone with very long string doesn't crash", async () => {
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    const result = await checkDuplicatePhone("9".repeat(10000));
    expect(result.duplicate).toBe(false);
  });
});
