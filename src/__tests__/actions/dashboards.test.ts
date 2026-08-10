import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    patient: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    appointment: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      groupBy: vi.fn(),
    },
    doctorProfile: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    invoice: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    medicine: {
      findMany: vi.fn(),
    },
    consultation: {
      count: vi.fn(),
    },
    labTestOrder: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    prescription: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  getAdminDashboardData,
  getDoctorDashboardData,
  getPatientDashboardData,
  getReceptionistDashboardData,
  getLabDashboardData,
} from "@/actions/dashboards";

const mockAuth = vi.mocked(auth) as unknown as {
  mockReset(): void;
  mockResolvedValue(value: any): void;
};

function adminSession() {
  return {
    user: { id: "u1", role: "ADMIN" as const, name: "Admin" },
    expires: new Date().toISOString(),
  } as any;
}

function doctorSession() {
  return {
    user: {
      id: "u2",
      role: "DOCTOR" as const,
      name: "Dr. Smith",
      profileId: "doc1",
    },
    expires: new Date().toISOString(),
  } as any;
}

function patientSession() {
  return {
    user: {
      id: "u3",
      role: "PATIENT" as const,
      name: "John Doe",
      patientId: "p1",
    },
    expires: new Date().toISOString(),
  } as any;
}

function receptionistSession() {
  return {
    user: { id: "u4", role: "RECEPTIONIST" as const, name: "Rec" },
    expires: new Date().toISOString(),
  } as any;
}

function labSession() {
  return {
    user: { id: "u5", role: "LAB_TECHNICIAN" as const, name: "Lab Tech" },
    expires: new Date().toISOString(),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(null);
});

// ─── Admin Dashboard ───────────────────────────────────────────────────────────

describe("getAdminDashboardData", () => {
  it("returns dashboard data for admin", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.patient.count).mockResolvedValue(100);
    vi.mocked(prisma.appointment.count).mockResolvedValue(15);
    vi.mocked(prisma.doctorProfile.count).mockResolvedValue(8);
    vi.mocked(prisma.invoice.count).mockResolvedValue(3);
    vi.mocked(prisma.invoice.findMany)
      .mockResolvedValueOnce([
        { totalAmount: 500 },
        { totalAmount: 300 },
      ] as any)
      .mockResolvedValueOnce([] as any);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.medicine.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.appointment.groupBy).mockResolvedValue([] as any);
    vi.mocked(prisma.doctorProfile.findMany).mockResolvedValue([] as any);

    const result = await getAdminDashboardData();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.totalPatients).toBe(100);
      expect(result.stats.todaysAppointments).toBe(15);
      expect(result.stats.activeDoctors).toBe(8);
      expect(result.stats.pendingInvoices).toBe(3);
      expect(result.stats.todayRevenue).toBe(800);
    }
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(getAdminDashboardData()).rejects.toThrow("Unauthorized");
  });
});

// ─── Doctor Dashboard ──────────────────────────────────────────────────────────

describe("getDoctorDashboardData", () => {
  it("returns dashboard data for doctor", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    vi.mocked(prisma.appointment.count).mockResolvedValue(10);
    vi.mocked(prisma.consultation.count).mockResolvedValue(5);
    vi.mocked(prisma.labTestOrder.count).mockResolvedValue(3);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.patient.findMany).mockResolvedValue([] as any);

    const result = await getDoctorDashboardData();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.todaysAppointments).toBe(10);
      expect(result.stats.patientsSeenToday).toBe(5);
      expect(result.stats.pendingLabResults).toBe(3);
    }
  });

  it("rejects non-doctor", async () => {
    mockAuth.mockResolvedValue(adminSession());
    await expect(getDoctorDashboardData()).rejects.toThrow("Unauthorized");
  });
});

// ─── Patient Dashboard ─────────────────────────────────────────────────────────

describe("getPatientDashboardData", () => {
  it("returns dashboard data for patient", async () => {
    mockAuth.mockResolvedValue(patientSession());
    vi.mocked(prisma.appointment.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.prescription.count).mockResolvedValue(2);
    vi.mocked(prisma.labTestOrder.count).mockResolvedValue(1);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.prescription.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.labTestOrder.findMany).mockResolvedValue([] as any);

    const result = await getPatientDashboardData();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.activePrescriptions).toBe(2);
      expect(result.stats.pendingLabResults).toBe(1);
      expect(result.nextAppointment).toBeNull();
    }
  });

  it("rejects non-patient", async () => {
    mockAuth.mockResolvedValue(adminSession());
    await expect(getPatientDashboardData()).rejects.toThrow("Unauthorized");
  });
});

// ─── Receptionist Dashboard ────────────────────────────────────────────────────

describe("getReceptionistDashboardData", () => {
  it("returns dashboard data for receptionist", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.appointment.count).mockResolvedValue(20);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([] as any);

    const result = await getReceptionistDashboardData();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.todaysTotal).toBe(20);
    }
  });

  it("rejects non-receptionist", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(getReceptionistDashboardData()).rejects.toThrow(
      "Unauthorized",
    );
  });
});

// ─── Lab Technician Dashboard ──────────────────────────────────────────────────

describe("getLabDashboardData", () => {
  it("returns dashboard data for lab technician", async () => {
    mockAuth.mockResolvedValue(labSession());
    vi.mocked(prisma.labTestOrder.count).mockResolvedValue(5);
    vi.mocked(prisma.labTestOrder.findMany).mockResolvedValue([] as any);

    const result = await getLabDashboardData();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stats.pendingTests).toBe(5);
    }
  });

  it("rejects non-lab-tech", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(getLabDashboardData()).rejects.toThrow("Unauthorized");
  });
});
