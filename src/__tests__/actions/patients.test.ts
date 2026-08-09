import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock auth — controlled via setAuthSession
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

import { prisma } from "@/lib/prisma";
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
  mockResolvedValueOnce(value: any): void;
};

function mockSession(role: string) {
  return {
    user: {
      id: "test-id",
      role,
      name: "Test User",
      email: "test@carepoint.in",
    },
    expires: new Date().toISOString(),
  } as any;
}

describe("createPatient", () => {
  beforeEach(() => {
    vi.mocked(prisma.patient.findFirst).mockReset();
    vi.mocked(prisma.patient.create).mockReset();
    mockAuth.mockReset();
  });

  it("rejects unauthenticated users", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(
      createPatient({ firstName: "A", lastName: "B", phone: "123" } as any),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects PATIENT role", async () => {
    mockAuth.mockResolvedValue(mockSession("PATIENT"));
    await expect(
      createPatient({ firstName: "A", lastName: "B", phone: "123" } as any),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects DOCTOR role", async () => {
    mockAuth.mockResolvedValue(mockSession("DOCTOR"));
    await expect(
      createPatient({ firstName: "A", lastName: "B", phone: "123" } as any),
    ).rejects.toThrow("Unauthorized");
  });

  it("accepts RECEPTIONIST and creates patient with MRN", async () => {
    mockAuth.mockResolvedValue(mockSession("RECEPTIONIST"));
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "Rahul",
      lastName: "Kumar",
    } as any);

    const result = await createPatient({
      firstName: "Rahul",
      lastName: "Kumar",
      phone: "+91 98765 43210",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patient.mrn).toBe("MRN-00001");
    }
    expect(vi.mocked(prisma.patient.create)).toHaveBeenCalledTimes(1);
  });

  it("accepts ADMIN and creates patient", async () => {
    mockAuth.mockResolvedValue(mockSession("ADMIN"));
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p2",
      mrn: "MRN-00002",
      firstName: "Priya",
      lastName: "Sharma",
    } as any);

    const result = await createPatient({
      firstName: "Priya",
      lastName: "Sharma",
      phone: "+91 98765 43211",
    });

    expect(result.ok).toBe(true);
  });

  it("returns error for invalid input (missing firstName)", async () => {
    mockAuth.mockResolvedValue(mockSession("RECEPTIONIST"));
    const result = await createPatient({
      firstName: "",
      lastName: "Kumar",
      phone: "+91 98765 43210",
    } as any);

    expect(result.ok).toBe(false);
  });

  it("increments MRN from the last patient", async () => {
    mockAuth.mockResolvedValue(mockSession("RECEPTIONIST"));
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({
      mrn: "MRN-00005",
    } as any);
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p3",
      mrn: "MRN-00006",
      firstName: "Test",
      lastName: "User",
    } as any);

    const result = await createPatient({
      firstName: "Test",
      lastName: "User",
      phone: "+91 99999 99999",
    });

    expect(result.ok).toBe(true);
    const createCall = vi.mocked(prisma.patient.create).mock.calls[0][0];
    expect(createCall.data.mrn).toBe("MRN-00006");
  });

  it("saves optional fields", async () => {
    mockAuth.mockResolvedValue(mockSession("RECEPTIONIST"));
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p4",
      mrn: "MRN-00001",
      firstName: "Rahul",
      lastName: "Kumar",
    } as any);

    await createPatient({
      firstName: "Rahul",
      lastName: "Kumar",
      phone: "+91 98765 43210",
      email: "rahul@example.com",
      bloodGroup: "B+",
      address: "123 Main St",
      allergies: "Penicillin",
    });

    const createCall = vi.mocked(prisma.patient.create).mock.calls[0][0];
    expect(createCall.data.email).toBe("rahul@example.com");
    expect(createCall.data.bloodGroup).toBe("B+");
    expect(createCall.data.address).toBe("123 Main St");
    expect(createCall.data.allergies).toBe("Penicillin");
  });
});

describe("searchPatients", () => {
  beforeEach(() => {
    vi.mocked(prisma.patient.findMany).mockReset();
    mockAuth.mockReset();
  });

  it("rejects unauthenticated users", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(searchPatients("test")).rejects.toThrow("Unauthorized");
  });

  it("rejects PATIENT role", async () => {
    mockAuth.mockResolvedValue(mockSession("PATIENT"));
    await expect(searchPatients("test")).rejects.toThrow("Unauthorized");
  });

  it("accepts RECEPTIONIST and returns results", async () => {
    mockAuth.mockResolvedValue(mockSession("RECEPTIONIST"));
    vi.mocked(prisma.patient.findMany).mockResolvedValue([
      {
        id: "p1",
        mrn: "MRN-00001",
        firstName: "Rahul",
        lastName: "Kumar",
        phone: "+91 98765 43210",
        createdAt: new Date("2024-01-01"),
        appointments: [],
      },
    ] as any);

    const result = await searchPatients("Rahul");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patients).toHaveLength(1);
      expect(result.patients[0].firstName).toBe("Rahul");
    }
  });

  it("accepts DOCTOR for search", async () => {
    mockAuth.mockResolvedValue(mockSession("DOCTOR"));
    vi.mocked(prisma.patient.findMany).mockResolvedValue([] as any);

    const result = await searchPatients("xyz");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patients).toHaveLength(0);
    }
  });

  it("returns empty for queries shorter than 2 chars", async () => {
    mockAuth.mockResolvedValue(mockSession("RECEPTIONIST"));
    const result = await searchPatients("a");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patients).toHaveLength(0);
    }
    expect(vi.mocked(prisma.patient.findMany).mock.calls).toHaveLength(0);
  });

  it("uses lastVisit from latest appointment if available", async () => {
    mockAuth.mockResolvedValue(mockSession("RECEPTIONIST"));
    const visitDate = new Date("2024-06-15");
    vi.mocked(prisma.patient.findMany).mockResolvedValue([
      {
        id: "p1",
        mrn: "MRN-00001",
        firstName: "Rahul",
        lastName: "Kumar",
        phone: "+91 98765 43210",
        createdAt: new Date("2024-01-01"),
        appointments: [{ createdAt: visitDate }],
      },
    ] as any);

    const result = await searchPatients("Rahul");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patients[0].lastVisit).toEqual(visitDate);
    }
  });
});

describe("getPatient", () => {
  beforeEach(() => {
    vi.mocked(prisma.patient.findUnique).mockReset();
    mockAuth.mockReset();
  });

  it("rejects unauthenticated users", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getPatient("p1")).rejects.toThrow("Unauthorized");
  });

  it("returns patient for RECEPTIONIST", async () => {
    mockAuth.mockResolvedValue(mockSession("RECEPTIONIST"));
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "Rahul",
      lastName: "Kumar",
    } as any);

    const result = await getPatient("p1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patient.firstName).toBe("Rahul");
    }
  });

  it("returns error when patient not found", async () => {
    mockAuth.mockResolvedValue(mockSession("RECEPTIONIST"));
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null);

    const result = await getPatient("nonexistent");

    expect(result.ok).toBe(false);
  });
});

describe("updatePatient", () => {
  beforeEach(() => {
    vi.mocked(prisma.patient.update).mockReset();
    mockAuth.mockReset();
  });

  it("rejects unauthenticated users", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(
      updatePatient("p1", { firstName: "New" } as any),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects DOCTOR role", async () => {
    mockAuth.mockResolvedValue(mockSession("DOCTOR"));
    await expect(
      updatePatient("p1", { firstName: "New" } as any),
    ).rejects.toThrow("Unauthorized");
  });

  it("accepts RECEPTIONIST and updates fields", async () => {
    mockAuth.mockResolvedValue(mockSession("RECEPTIONIST"));
    vi.mocked(prisma.patient.update).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "NewName",
      lastName: "Kumar",
    } as any);

    const result = await updatePatient("p1", { firstName: "NewName" });

    expect(result.ok).toBe(true);
    const updateCall = vi.mocked(prisma.patient.update).mock.calls[0][0];
    expect(updateCall.data.firstName).toBe("NewName");
  });

  it("accepts ADMIN and updates fields", async () => {
    mockAuth.mockResolvedValue(mockSession("ADMIN"));
    vi.mocked(prisma.patient.update).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "Updated",
      lastName: "Name",
    } as any);

    const result = await updatePatient("p1", { address: "New Address" });

    expect(result.ok).toBe(true);
    const updateCall = vi.mocked(prisma.patient.update).mock.calls[0][0];
    expect(updateCall.data.address).toBe("New Address");
  });

  it("does not update phone (immutable in update schema)", async () => {
    mockAuth.mockResolvedValue(mockSession("RECEPTIONIST"));
    vi.mocked(prisma.patient.update).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "Rahul",
      lastName: "Kumar",
    } as any);

    await updatePatient("p1", { firstName: "Rahul" });

    const updateCall = vi.mocked(prisma.patient.update).mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("phone");
  });

  it("does not update MRN (immutable)", async () => {
    mockAuth.mockResolvedValue(mockSession("RECEPTIONIST"));
    vi.mocked(prisma.patient.update).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "Rahul",
      lastName: "Kumar",
    } as any);

    await updatePatient("p1", { firstName: "Rahul" });

    const updateCall = vi.mocked(prisma.patient.update).mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty("mrn");
  });
});
