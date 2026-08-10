import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    consultation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    prescription: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    labTestOrder: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    medicine: {
      findMany: vi.fn(),
    },
    testType: {
      findMany: vi.fn(),
    },
    patient: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  startConsultation,
  getConsultation,
  saveConsultation,
  savePrescription,
  orderLabTest,
  completeConsultation,
  getDoctorAppointments,
  getPatientTimeline,
  getActiveMedicines,
  getActiveTestTypes,
  getPrescription,
  getMyPrescriptions,
  getMyPatients,
  getDoctorPrescriptions,
  getDoctorLabOrders,
} from "@/actions/consultations";
import { isWithinEditWindow, hoursRemaining } from "@/lib/consultation-helpers";

const mockAuth = vi.mocked(auth) as unknown as {
  mockReset(): void;
  mockResolvedValue(value: any): void;
};

function doctorSession(profileId = "doc1") {
  return {
    user: {
      id: "doc-user-id",
      role: "DOCTOR" as const,
      name: "Dr. Test",
      email: "test-doctor@carepoint.in",
      profileId,
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

function receptionistSession() {
  return {
    user: {
      id: "rec-user-id",
      role: "RECEPTIONIST" as const,
      name: "Test Receptionist",
      email: "test-receptionist@carepoint.in",
    },
    expires: new Date().toISOString(),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(null);
});

// ─── startConsultation ─────────────────────────────────────────────────────────

describe("startConsultation", () => {
  it("starts consultation for a CHECKED_IN appointment", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "a1",
      doctorId: "doc1",
      patientId: "p1",
      status: "CHECKED_IN",
      patient: {
        id: "p1",
        firstName: "John",
        lastName: "Doe",
        mrn: "MRN-00001",
      },
    } as any);
    vi.mocked(prisma.appointment.update).mockResolvedValue({} as any);
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.consultation.create).mockResolvedValue({
      id: "c1",
      appointmentId: "a1",
      doctorId: "doc1",
      patientId: "p1",
    } as any);

    const result = await startConsultation("a1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.consultation.id).toBe("c1");
      expect(result.patient.firstName).toBe("John");
    }
    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: "a1" },
      data: { status: "IN_CONSULTATION" },
    });
  });

  it("reuses existing consultation if one already exists", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "a1",
      doctorId: "doc1",
      patientId: "p1",
      status: "CHECKED_IN",
      patient: { id: "p1", firstName: "John" },
    } as any);
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
      id: "existing-c1",
      appointmentId: "a1",
    } as any);

    const result = await startConsultation("a1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.consultation.id).toBe("existing-c1");
    expect(prisma.consultation.create).not.toHaveBeenCalled();
  });

  it("rejects if appointment is not CHECKED_IN", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "a1",
      doctorId: "doc1",
      status: "CONFIRMED",
    } as any);

    const result = await startConsultation("a1");
    expect(result.ok).toBe(false);
  });

  it("rejects if appointment belongs to another doctor", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "a1",
      doctorId: "doc2",
      status: "CHECKED_IN",
    } as any);

    const result = await startConsultation("a1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Not your appointment");
  });

  it("rejects if appointment not found", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null);

    const result = await startConsultation("nonexistent");
    expect(result.ok).toBe(false);
  });

  it("rejects non-doctor roles", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(startConsultation("a1")).rejects.toThrow("Unauthorized");
  });
});

// ─── getConsultation ───────────────────────────────────────────────────────────

describe("getConsultation", () => {
  it("returns consultation with patient and prescription data", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "a1",
      doctorId: "doc1",
      patient: { id: "p1", firstName: "John" },
      consultation: {
        id: "c1",
        symptoms: "Fever",
        prescription: { id: "rx1", items: [] },
        labTestOrders: [],
      },
    } as any);

    const result = await getConsultation("a1");
    expect(result.ok).toBe(true);
  });

  it("rejects if appointment belongs to another doctor", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "a1",
      doctorId: "doc2",
    } as any);

    const result = await getConsultation("a1");
    expect(result.ok).toBe(false);
  });
});

// ─── saveConsultation ──────────────────────────────────────────────────────────

describe("saveConsultation", () => {
  const validInput = {
    appointmentId: "a1",
    symptoms: "Headache",
    diagnosis: "Migraine",
    notes: "Rest advised",
    vitals: {
      bp: "120/80",
      pulse: "72",
      temp: "98.6",
      weight: "70",
      height: "175",
    },
  };

  it("saves consultation fields", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
      id: "c1",
      doctorId: "doc1",
      completedAt: null,
    } as any);
    vi.mocked(prisma.consultation.update).mockResolvedValue({
      id: "c1",
      symptoms: "Headache",
    } as any);

    const result = await saveConsultation(validInput);
    expect(result.ok).toBe(true);
    expect(prisma.consultation.update).toHaveBeenCalled();
  });

  it("rejects if consultation is past 24h edit window", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
      id: "c1",
      doctorId: "doc1",
      completedAt: oldDate,
    } as any);

    const result = await saveConsultation(validInput);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("locked");
  });

  it("allows editing within 24h window", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h ago
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
      id: "c1",
      doctorId: "doc1",
      completedAt: recentDate,
    } as any);
    vi.mocked(prisma.consultation.update).mockResolvedValue({
      id: "c1",
    } as any);

    const result = await saveConsultation(validInput);
    expect(result.ok).toBe(true);
  });

  it("rejects if consultation belongs to another doctor", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
      id: "c1",
      doctorId: "doc2",
      completedAt: null,
    } as any);

    const result = await saveConsultation(validInput);
    expect(result.ok).toBe(false);
  });

  it("rejects invalid input (missing appointmentId)", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    const result = await saveConsultation({ ...validInput, appointmentId: "" });
    expect(result.ok).toBe(false);
  });
});

// ─── savePrescription ──────────────────────────────────────────────────────────

describe("savePrescription", () => {
  const validInput = {
    consultationId: "c1",
    items: [
      {
        medicineId: "med1",
        dosage: "1 tablet",
        frequency: "OD" as const,
        duration: "7 days",
        instructions: "After meals",
        quantity: 7,
      },
    ],
  };

  it("creates a new prescription with items", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
      id: "c1",
      doctorId: "doc1",
      completedAt: null,
      prescription: null,
    } as any);
    vi.mocked(prisma.prescription.create).mockResolvedValue({
      id: "rx1",
      items: [{ id: "pi1", medicine: { name: "Paracetamol" } }],
    } as any);

    const result = await savePrescription(validInput);
    expect(result.ok).toBe(true);
    expect(prisma.prescription.create).toHaveBeenCalled();
  });

  it("replaces existing prescription (delete + create)", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
      id: "c1",
      doctorId: "doc1",
      completedAt: null,
      prescription: { id: "old-rx", items: [{ dispensed: false }] },
    } as any);
    vi.mocked(prisma.prescription.delete).mockResolvedValue({} as any);
    vi.mocked(prisma.prescription.create).mockResolvedValue({
      id: "new-rx",
      items: [],
    } as any);

    const result = await savePrescription(validInput);
    expect(result.ok).toBe(true);
    expect(prisma.prescription.delete).toHaveBeenCalledWith({
      where: { id: "old-rx" },
    });
  });

  it("rejects if any item has been dispensed", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
      id: "c1",
      doctorId: "doc1",
      completedAt: null,
      prescription: { id: "rx1", items: [{ dispensed: true }] },
    } as any);

    const result = await savePrescription(validInput);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("dispensed");
  });

  it("rejects if past 24h edit window", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
      id: "c1",
      doctorId: "doc1",
      completedAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
      prescription: null,
    } as any);

    const result = await savePrescription(validInput);
    expect(result.ok).toBe(false);
  });

  it("rejects empty items array", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    const result = await savePrescription({ consultationId: "c1", items: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid frequency", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    const result = await savePrescription({
      consultationId: "c1",
      items: [
        {
          medicineId: "med1",
          dosage: "1 tab",
          frequency: "INVALID" as any,
          duration: "7 days",
          quantity: 7,
        },
      ],
    });
    expect(result.ok).toBe(false);
  });
});

// ─── orderLabTest ──────────────────────────────────────────────────────────────

describe("orderLabTest", () => {
  const validInput = {
    consultationId: "c1",
    patientId: "p1",
    testTypeId: "tt1",
    priority: "NORMAL" as const,
    instructions: "Fasting sample",
  };

  it("creates a lab test order", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
      id: "c1",
      doctorId: "doc1",
    } as any);
    vi.mocked(prisma.labTestOrder.create).mockResolvedValue({
      id: "lt1",
      testType: { name: "CBC" },
    } as any);

    const result = await orderLabTest(validInput);
    expect(result.ok).toBe(true);
    expect(prisma.labTestOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          testTypeId: "tt1",
          priority: "NORMAL",
          instructions: "Fasting sample",
        }),
      }),
    );
  });

  it("defaults priority to NORMAL", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
      id: "c1",
      doctorId: "doc1",
    } as any);
    vi.mocked(prisma.labTestOrder.create).mockResolvedValue({
      id: "lt1",
      testType: { name: "CBC" },
    } as any);

    const { priority: _priority, ...inputWithoutPriority } = validInput;
    const result = await orderLabTest(inputWithoutPriority as any);
    expect(result.ok).toBe(true);
  });

  it("rejects if consultation belongs to another doctor", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
      id: "c1",
      doctorId: "doc2",
    } as any);

    const result = await orderLabTest(validInput);
    expect(result.ok).toBe(false);
  });

  it("rejects if consultation not found", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(null);

    const result = await orderLabTest(validInput);
    expect(result.ok).toBe(false);
  });
});

// ─── completeConsultation ──────────────────────────────────────────────────────

describe("completeConsultation", () => {
  it("completes consultation and sets completedAt", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "a1",
      doctorId: "doc1",
      status: "IN_CONSULTATION",
      consultation: { id: "c1" },
    } as any);
    vi.mocked(prisma.$transaction).mockResolvedValue([
      { id: "a1", status: "COMPLETED" },
      { id: "c1", completedAt: new Date() },
    ]);

    const result = await completeConsultation("a1");
    expect(result.ok).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("rejects if appointment is not IN_CONSULTATION", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "a1",
      doctorId: "doc1",
      status: "CHECKED_IN",
      consultation: { id: "c1" },
    } as any);

    const result = await completeConsultation("a1");
    expect(result.ok).toBe(false);
  });

  it("rejects if no consultation record exists", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "a1",
      doctorId: "doc1",
      status: "IN_CONSULTATION",
      consultation: null,
    } as any);

    const result = await completeConsultation("a1");
    expect(result.ok).toBe(false);
  });

  it("rejects if appointment belongs to another doctor", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "a1",
      doctorId: "doc2",
      status: "IN_CONSULTATION",
    } as any);

    const result = await completeConsultation("a1");
    expect(result.ok).toBe(false);
  });
});

// ─── getDoctorAppointments ─────────────────────────────────────────────────────

describe("getDoctorAppointments", () => {
  it("returns appointments for the logged-in doctor", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      { id: "a1", startTime: "09:00", patient: { firstName: "John" } },
    ] as any);

    const result = await getDoctorAppointments();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.appointments).toHaveLength(1);
  });

  it("rejects if doctor has no profileId", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "doc-user-id",
        role: "DOCTOR" as const,
        name: "Dr. Test",
        email: "test-doctor@carepoint.in",
        // no profileId
      },
      expires: new Date().toISOString(),
    } as any);
    const result = await getDoctorAppointments();
    expect(result.ok).toBe(false);
  });
});

// ─── getPatientTimeline ────────────────────────────────────────────────────────

describe("getPatientTimeline", () => {
  it("returns patient timeline data", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.patient.findUnique).mockResolvedValue({
      id: "p1",
      firstName: "John",
      mrn: "MRN-00001",
    } as any);
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([]);
    vi.mocked(prisma.prescription.findMany).mockResolvedValue([]);
    vi.mocked(prisma.labTestOrder.findMany).mockResolvedValue([]);

    const result = await getPatientTimeline("p1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.patient.firstName).toBe("John");
  });

  it("rejects if patient not found", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.patient.findUnique).mockResolvedValue(null);

    const result = await getPatientTimeline("nonexistent");
    expect(result.ok).toBe(false);
  });
});

// ─── getActiveMedicines / getActiveTestTypes ───────────────────────────────────

describe("getActiveMedicines", () => {
  it("returns active medicines", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.medicine.findMany).mockResolvedValue([
      { id: "m1", name: "Paracetamol 500mg" },
    ] as any);

    const result = await getActiveMedicines();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.medicines).toHaveLength(1);
  });
});

describe("getActiveTestTypes", () => {
  it("returns active test types", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.testType.findMany).mockResolvedValue([
      { id: "tt1", name: "CBC", code: "CBC" },
    ] as any);

    const result = await getActiveTestTypes();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.testTypes).toHaveLength(1);
  });
});

// ─── getPrescription ───────────────────────────────────────────────────────────

describe("getPrescription", () => {
  it("returns prescription with items", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.prescription.findUnique).mockResolvedValue({
      id: "rx1",
      items: [{ medicine: { name: "Paracetamol" } }],
      consultation: {
        patientId: "p1",
        doctor: { user: { name: "Dr. Test" } },
        patient: { firstName: "John", mrn: "MRN-00001" },
      },
    } as any);

    const result = await getPrescription("rx1");
    expect(result.ok).toBe(true);
  });

  it("patient can view their own prescription", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.prescription.findUnique).mockResolvedValue({
      id: "rx1",
      items: [],
      consultation: { patientId: "p1" },
    } as any);

    const result = await getPrescription("rx1");
    expect(result.ok).toBe(true);
  });

  it("patient cannot view another patient's prescription", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.prescription.findUnique).mockResolvedValue({
      id: "rx1",
      items: [],
      consultation: { patientId: "p2" },
    } as any);

    const result = await getPrescription("rx1");
    expect(result.ok).toBe(false);
  });

  it("rejects if prescription not found", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.prescription.findUnique).mockResolvedValue(null);

    const result = await getPrescription("nonexistent");
    expect(result.ok).toBe(false);
  });
});

// ─── 24h edit window helpers ───────────────────────────────────────────────────

describe("isWithinEditWindow", () => {
  it("returns true for null completedAt (not yet completed)", () => {
    expect(isWithinEditWindow(null)).toBe(true);
  });

  it("returns true within 24h", () => {
    const recent = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1h ago
    expect(isWithinEditWindow(recent)).toBe(true);
  });

  it("returns false after 24h", () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago
    expect(isWithinEditWindow(old)).toBe(false);
  });
});

describe("hoursRemaining", () => {
  it("returns null for null completedAt", () => {
    expect(hoursRemaining(null)).toBeNull();
  });

  it("returns hours remaining within window", () => {
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h ago
    expect(hoursRemaining(recent)).toBe(22);
  });

  it("returns 0 after window expires", () => {
    const old = new Date(Date.now() - 30 * 60 * 60 * 1000); // 30h ago
    expect(hoursRemaining(old)).toBe(0);
  });
});

// ─── Authorization ─────────────────────────────────────────────────────────────

describe("Authorization — non-doctor roles rejected", () => {
  it("rejects PATIENT for startConsultation", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(startConsultation("a1")).rejects.toThrow("Unauthorized");
  });

  it("rejects RECEPTIONIST for saveConsultation", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    await expect(saveConsultation({ appointmentId: "a1" })).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("rejects unauthenticated for getDoctorAppointments", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getDoctorAppointments()).rejects.toThrow("Unauthorized");
  });
});

// ─── getMyPrescriptions ───────────────────────────────────────────────────────

describe("getMyPrescriptions", () => {
  beforeEach(() => {
    vi.mocked(prisma.prescription.findMany).mockReset();
  });

  it("returns prescriptions for the logged-in patient", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.prescription.findMany).mockResolvedValue([
      {
        id: "rx1",
        createdAt: new Date(),
        items: [
          {
            id: "i1",
            dosage: "1 tab",
            frequency: "OD",
            duration: "5 days",
            instructions: null,
            quantity: 5,
            medicine: { name: "Paracetamol" },
          },
        ],
        consultation: {
          doctor: { user: { name: "Dr. Rajesh" } },
          appointment: { date: new Date() },
        },
      },
    ] as any);

    const result = await getMyPrescriptions();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prescriptions).toHaveLength(1);
      expect(result.prescriptions[0].doctorName).toBe("Dr. Rajesh");
      expect(result.prescriptions[0].items).toHaveLength(1);
      expect(result.prescriptions[0].items[0].medicineName).toBe("Paracetamol");
    }
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await getMyPrescriptions();
    expect(result.ok).toBe(false);
  });

  it("rejects non-patient roles", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    const result = await getMyPrescriptions();
    expect(result.ok).toBe(false);
  });

  it("returns empty array when patient has no prescriptions", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.prescription.findMany).mockResolvedValue([] as any);

    const result = await getMyPrescriptions();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.prescriptions).toHaveLength(0);
  });
});

// ─── getMyPatients ────────────────────────────────────────────────────────────

describe("getMyPatients", () => {
  beforeEach(() => {
    vi.mocked(prisma.patient.findMany).mockReset();
  });

  it("returns patients the doctor has consulted", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.patient.findMany).mockResolvedValue([
      {
        id: "p1",
        mrn: "MRN-00001",
        firstName: "John",
        lastName: "Doe",
        phone: "1234567890",
        email: null,
        dateOfBirth: null,
        gender: "Male",
        consultations: [{ createdAt: new Date("2024-06-01") }],
      },
    ] as any);

    const result = await getMyPatients();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patients).toHaveLength(1);
      expect(result.patients[0].firstName).toBe("John");
      expect(result.patients[0].lastConsultationDate).toBeDefined();
    }
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await getMyPatients();
    expect(result.ok).toBe(false);
  });

  it("rejects non-doctor roles", async () => {
    mockAuth.mockResolvedValue(patientSession());
    const result = await getMyPatients();
    expect(result.ok).toBe(false);
  });

  it("returns error when doctor has no profileId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", role: "DOCTOR" as const },
      expires: new Date().toISOString(),
    } as any);

    const result = await getMyPatients();
    expect(result.ok).toBe(false);
  });

  it("returns empty array when doctor has no patients", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.patient.findMany).mockResolvedValue([] as any);

    const result = await getMyPatients();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.patients).toHaveLength(0);
  });
});

// ─── getDoctorPrescriptions ───────────────────────────────────────────────────

describe("getDoctorPrescriptions", () => {
  beforeEach(() => {
    vi.mocked(prisma.prescription.findMany).mockReset();
  });

  it("returns prescriptions written by the doctor", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.prescription.findMany).mockResolvedValue([
      {
        id: "rx1",
        createdAt: new Date(),
        items: [
          {
            id: "i1",
            dosage: "1 tab",
            frequency: "OD",
            duration: "5 days",
            instructions: null,
            quantity: 5,
            medicine: { name: "Paracetamol" },
          },
        ],
        consultation: {
          patient: {
            id: "p1",
            mrn: "MRN-00001",
            firstName: "John",
            lastName: "Doe",
          },
          appointment: { date: new Date() },
        },
      },
    ] as any);

    const result = await getDoctorPrescriptions();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prescriptions).toHaveLength(1);
      expect(result.prescriptions[0].patientName).toBe("John Doe");
      expect(result.prescriptions[0].itemCount).toBe(1);
    }
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await getDoctorPrescriptions();
    expect(result.ok).toBe(false);
  });

  it("rejects non-doctor roles", async () => {
    mockAuth.mockResolvedValue(patientSession());
    const result = await getDoctorPrescriptions();
    expect(result.ok).toBe(false);
  });

  it("returns error when doctor has no profileId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", role: "DOCTOR" as const },
      expires: new Date().toISOString(),
    } as any);

    const result = await getDoctorPrescriptions();
    expect(result.ok).toBe(false);
  });
});

// ─── getDoctorLabOrders ───────────────────────────────────────────────────────

describe("getDoctorLabOrders", () => {
  beforeEach(() => {
    vi.mocked(prisma.labTestOrder.findMany).mockReset();
  });

  it("returns lab orders placed by the doctor", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.labTestOrder.findMany).mockResolvedValue([
      {
        id: "lt1",
        status: "COMPLETED",
        priority: "ROUTINE",
        isInternal: true,
        createdAt: new Date(),
        testType: { name: "CBC", code: "CBC" },
        patient: {
          id: "p1",
          mrn: "MRN-00001",
          firstName: "John",
          lastName: "Doe",
        },
        result: {
          results: [
            {
              parameter: "Hemoglobin",
              value: "14.5",
              unit: "g/dL",
              referenceRange: "13-17",
            },
          ],
          notes: null,
        },
      },
    ] as any);

    const result = await getDoctorLabOrders();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.labOrders).toHaveLength(1);
      expect(result.labOrders[0].testName).toBe("CBC");
      expect(result.labOrders[0].patientName).toBe("John Doe");
    }
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await getDoctorLabOrders();
    expect(result.ok).toBe(false);
  });

  it("rejects non-doctor roles", async () => {
    mockAuth.mockResolvedValue(patientSession());
    const result = await getDoctorLabOrders();
    expect(result.ok).toBe(false);
  });

  it("returns error when doctor has no profileId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", role: "DOCTOR" as const },
      expires: new Date().toISOString(),
    } as any);

    const result = await getDoctorLabOrders();
    expect(result.ok).toBe(false);
  });

  it("returns empty array when doctor has no lab orders", async () => {
    mockAuth.mockResolvedValue(doctorSession("doc1"));
    vi.mocked(prisma.labTestOrder.findMany).mockResolvedValue([] as any);

    const result = await getDoctorLabOrders();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.labOrders).toHaveLength(0);
  });
});
