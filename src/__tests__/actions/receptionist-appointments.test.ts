import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    blockedDate: {
      findUnique: vi.fn(),
    },
    scheduleBlock: {
      findMany: vi.fn(),
    },
    appointment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    doctorProfile: {
      findMany: vi.fn(),
    },
    department: {
      findMany: vi.fn(),
    },
    patient: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  getTodaysAppointments,
  checkInAppointment,
  markNoShow,
  walkInRegistration,
  bookAppointment,
} from "@/actions/appointments";

const mockAuth = vi.mocked(auth) as unknown as {
  mockReset(): void;
  mockResolvedValue(value: any): void;
};

function receptionistSession() {
  return {
    user: {
      id: "rec-id",
      role: "RECEPTIONIST" as const,
      name: "Test Receptionist",
      email: "test-receptionist@carepoint.in",
    },
    expires: new Date().toISOString(),
  } as any;
}

function patientSession(patientId = "p1") {
  return {
    user: {
      id: "pat-user-id",
      role: "PATIENT" as const,
      name: "Test Patient",
      email: "test-patient@carepoint.in",
      patientId,
    },
    expires: new Date().toISOString(),
  } as any;
}

// ─── getTodaysAppointments ─────────────────────────────────────────────────────

describe("getTodaysAppointments", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.appointment.findMany).mockReset();
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getTodaysAppointments()).rejects.toThrow("Unauthorized");
  });

  it("rejects patient role", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(getTodaysAppointments()).rejects.toThrow("Unauthorized");
  });

  it("returns today's appointments for receptionist", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "apt1",
        patientId: "p1",
        doctorId: "doc1",
        startTime: "09:00",
        endTime: "09:30",
        status: "CONFIRMED",
        reason: null,
        patient: {
          id: "p1",
          mrn: "MRN-00001",
          firstName: "Rahul",
          lastName: "Sharma",
          phone: "9876543210",
        },
        doctor: {
          user: { name: "Dr. Smith" },
          department: { name: "Cardiology" },
        },
      },
    ] as any);

    const result = await getTodaysAppointments();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.appointments).toHaveLength(1);
      expect(result.appointments[0].patientName).toBe("Rahul Sharma");
      expect(result.appointments[0].mrn).toBe("MRN-00001");
      expect(result.appointments[0].doctorName).toBe("Dr. Smith");
    }
  });
});

// ─── checkInAppointment ────────────────────────────────────────────────────────

describe("checkInAppointment", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.appointment.findUnique).mockReset();
    vi.mocked(prisma.appointment.update).mockReset();
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(checkInAppointment("apt1")).rejects.toThrow("Unauthorized");
  });

  it("rejects patient role", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(checkInAppointment("apt1")).rejects.toThrow("Unauthorized");
  });

  it("rejects non-existent appointment", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null);

    const result = await checkInAppointment("apt1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("not found");
    }
  });

  it("rejects check-in of non-confirmed appointment", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt1",
      status: "CHECKED_IN",
    } as any);

    const result = await checkInAppointment("apt1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("confirmed");
    }
  });

  it("checks in successfully", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt1",
      status: "CONFIRMED",
    } as any);
    vi.mocked(prisma.appointment.update).mockResolvedValue({
      id: "apt1",
      status: "CHECKED_IN",
    } as any);

    const result = await checkInAppointment("apt1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.appointment.status).toBe("CHECKED_IN");
    }
    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: "apt1" },
      data: { status: "CHECKED_IN" },
    });
  });
});

// ─── markNoShow ────────────────────────────────────────────────────────────────

describe("markNoShow", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.appointment.findUnique).mockReset();
    vi.mocked(prisma.appointment.update).mockReset();
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(markNoShow("apt1")).rejects.toThrow("Unauthorized");
  });

  it("rejects patient role", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(markNoShow("apt1")).rejects.toThrow("Unauthorized");
  });

  it("rejects non-existent appointment", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null);

    const result = await markNoShow("apt1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("not found");
    }
  });

  it("rejects no-show for non-checked-in appointment", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt1",
      status: "CONFIRMED",
    } as any);

    const result = await markNoShow("apt1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("checked-in");
    }
  });

  it("marks no-show successfully", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt1",
      status: "CHECKED_IN",
    } as any);
    vi.mocked(prisma.appointment.update).mockResolvedValue({
      id: "apt1",
      status: "NO_SHOW",
    } as any);

    const result = await markNoShow("apt1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.appointment.status).toBe("NO_SHOW");
    }
  });
});

// ─── walkInRegistration ────────────────────────────────────────────────────────

describe("walkInRegistration", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.patient.findFirst).mockReset();
    vi.mocked(prisma.patient.create).mockReset();
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(
      walkInRegistration({
        firstName: "Rahul",
        lastName: "Sharma",
        phone: "9876543210",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects patient role", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(
      walkInRegistration({
        firstName: "Rahul",
        lastName: "Sharma",
        phone: "9876543210",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects invalid input", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    const result = await walkInRegistration({
      firstName: "",
      lastName: "Sharma",
      phone: "9876543210",
    });
    expect(result.ok).toBe(false);
  });

  it("creates patient with auto-generated MRN", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findFirst).mockResolvedValue({
      mrn: "MRN-00005",
    } as any);
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p10",
      mrn: "MRN-00006",
      firstName: "Rahul",
      lastName: "Sharma",
      phone: "9876543210",
    } as any);

    const result = await walkInRegistration({
      firstName: "Rahul",
      lastName: "Sharma",
      phone: "9876543210",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patient.mrn).toBe("MRN-00006");
      expect(result.patient.firstName).toBe("Rahul");
    }
    expect(prisma.patient.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        mrn: "MRN-00006",
        firstName: "Rahul",
        lastName: "Sharma",
        phone: "9876543210",
      }),
      select: expect.any(Object),
    });
  });

  it("generates MRN-00001 when no patients exist", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "New",
      lastName: "Patient",
      phone: "9876543210",
    } as any);

    const result = await walkInRegistration({
      firstName: "New",
      lastName: "Patient",
      phone: "9876543210",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patient.mrn).toBe("MRN-00001");
    }
  });
});

// ─── bookAppointment (receptionist on behalf) ──────────────────────────────────

describe("bookAppointment (receptionist on behalf)", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.blockedDate.findUnique).mockReset();
    vi.mocked(prisma.appointment.create).mockReset();
  });

  it("rejects receptionist booking without patientId", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    const result = await bookAppointment({
      doctorId: "doc1",
      date: "2024-03-15",
      startTime: "09:00",
      endTime: "09:30",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Patient is required");
    }
  });

  it("allows receptionist to book with patientId", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appointment.create).mockResolvedValue({
      id: "apt1",
      patientId: "p1",
      doctorId: "doc1",
      date: new Date("2024-03-15"),
      startTime: "09:00",
      endTime: "09:30",
      status: "CONFIRMED",
    } as any);

    const result = await bookAppointment({
      doctorId: "doc1",
      date: "2024-03-15",
      startTime: "09:00",
      endTime: "09:30",
      patientId: "p1",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.appointment.id).toBe("apt1");
    }
    expect(prisma.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        patientId: "p1",
        doctorId: "doc1",
      }),
    });
  });
});
