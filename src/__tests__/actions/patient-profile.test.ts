import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    consultation: { findMany: vi.fn() },
    prescription: { findMany: vi.fn() },
    labTestOrder: { findMany: vi.fn() },
    appointment: { findMany: vi.fn() },
    invoice: { findMany: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getPatientProfile } from "@/actions/patient-profile";

const mockAuth = vi.mocked(auth) as unknown as {
  mockReset(): void;
  mockResolvedValue(value: any): void;
};

function adminSession() {
  return { user: { id: "u1", role: "ADMIN" as const }, expires: new Date().toISOString() } as any;
}

function doctorSession() {
  return { user: { id: "u2", role: "DOCTOR" as const, profileId: "d1" }, expires: new Date().toISOString() } as any;
}

function patientSession() {
  return { user: { id: "u3", role: "PATIENT" as const, patientId: "p1" }, expires: new Date().toISOString() } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(null);
});

describe("getPatientProfile", () => {
  it("returns full profile for admin", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
      id: "p1", mrn: "MRN-00001", firstName: "John", lastName: "Doe",
      phone: "123", email: null, dateOfBirth: null, gender: null,
      bloodGroup: null, address: null, allergies: null,
      emergencyName: null, emergencyPhone: null, emergencyRelation: null,
      medicalHistory: null, userId: null, createdAt: new Date(), updatedAt: new Date(),
    } as any);
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.prescription.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.labTestOrder.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([] as any);

    const result = await getPatientProfile("p1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patient.firstName).toBe("John");
      expect(result.consultations).toEqual([]);
      expect(result.prescriptions).toEqual([]);
    }
  });

  it("returns error for non-existent patient", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.prescription.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.labTestOrder.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([] as any);

    const result = await getPatientProfile("nonexistent");
    expect(result.ok).toBe(false);
  });

  it("rejects patient role", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(getPatientProfile("p1")).rejects.toThrow("Unauthorized");
  });

  it("allows doctor role", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
      id: "p1", mrn: "MRN-001", firstName: "Jane", lastName: "Smith",
      phone: "456", email: null, dateOfBirth: null, gender: null,
      bloodGroup: null, address: null, allergies: null,
      emergencyName: null, emergencyPhone: null, emergencyRelation: null,
      medicalHistory: null, userId: null, createdAt: new Date(), updatedAt: new Date(),
    } as any);
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.prescription.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.labTestOrder.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([] as any);

    const result = await getPatientProfile("p1");
    expect(result.ok).toBe(true);
  });
});
