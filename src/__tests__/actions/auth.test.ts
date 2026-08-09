import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    patient: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock password hashing — return a fixed hash
vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn(async (pw: string) => `hashed-${pw}`),
}));

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signupPatient, checkDuplicatePhone } from "@/actions/auth";

describe("checkDuplicatePhone (server action)", () => {
  beforeEach(() => {
    vi.mocked(prisma.patient.findFirst).mockReset();
  });

  it("returns duplicate=true when a patient with the phone exists", async () => {
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({
      id: "p1",
      firstName: "Rahul",
      lastName: "Kumar",
    } as any);

    const result = await checkDuplicatePhone("+91 98765 43210");

    expect(result.duplicate).toBe(true);
    expect(result.existingPatient?.firstName).toBe("Rahul");
  });

  it("returns duplicate=false when no patient with the phone exists", async () => {
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);

    const result = await checkDuplicatePhone("+91 99999 99999");

    expect(result.duplicate).toBe(false);
    expect(result.existingPatient).toBeNull();
  });
});

describe("signupPatient (server action)", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.create).mockReset();
    vi.mocked(prisma.patient.findFirst).mockReset();
    vi.mocked(hashPassword).mockReset();
  });

  const validInput = {
    firstName: "John",
    lastName: "Doe",
    phone: "+91 99999 99999",
    email: "john.doe@example.com",
    password: "secret123",
  };

  it("rejects invalid input (missing first name)", async () => {
    const result = await signupPatient({ ...validInput, firstName: "" });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid email", async () => {
    const result = await signupPatient({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects short password", async () => {
    const result = await signupPatient({ ...validInput, password: "12345" });
    expect(result.ok).toBe(false);
  });

  it("rejects if email already exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1" } as any);

    const result = await signupPatient(validInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("already exists");
    }
  });

  it("creates user + patient and returns MRN", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({
      mrn: "MRN-00005",
    } as any);
    vi.mocked(hashPassword).mockResolvedValue("hashed-secret123");
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "new-user-id",
      patient: { mrn: "MRN-00006", id: "new-patient-id" },
    } as any);

    const result = await signupPatient(validInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mrn).toBe("MRN-00006");
      expect(result.userId).toBe("new-user-id");
    }
    // Verify create was called with correct data
    expect(prisma.user.create).toHaveBeenCalledOnce();
    const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
    expect(createCall.data.email).toBe("john.doe@example.com");
    expect(createCall.data.password).toBe("hashed-secret123");
  });

  it("generates MRN-00001 when no patients exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed-pw");
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "new-user-id",
      patient: { mrn: "MRN-00001", id: "new-patient-id" },
    } as any);

    const result = await signupPatient(validInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mrn).toBe("MRN-00001");
    }
  });

  it("saves optional fields when provided", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(hashPassword).mockResolvedValue("hashed-pw");
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "new-user-id",
      patient: { mrn: "MRN-00001", id: "new-patient-id" },
    } as any);

    const inputWithOptionals = {
      ...validInput,
      dateOfBirth: "1990-01-15",
      gender: "MALE" as const,
      bloodGroup: "O+",
      address: "123 Test Street",
      emergencyName: "Jane Doe",
      emergencyPhone: "+91 88888 88888",
      emergencyRelation: "Spouse",
      allergies: "Penicillin",
      medicalHistory: "Asthma",
    };

    const result = await signupPatient(inputWithOptionals);

    expect(result.ok).toBe(true);
    const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
    const patientCreate = (createCall.data as any).patient.create;
    expect(patientCreate.dateOfBirth).toEqual(new Date("1990-01-15"));
    expect(patientCreate.gender).toBe("MALE");
    expect(patientCreate.bloodGroup).toBe("O+");
    expect(patientCreate.allergies).toBe("Penicillin");
  });
});
