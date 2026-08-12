import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
    },
    consultation: {
      findFirst: vi.fn(async () => null),
    },
    patient: {
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
    },
    prescription: {
      findFirst: vi.fn(async () => null),
    },
    prescriptionItem: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/actions/appointments", () => ({
  bookAppointment: vi.fn(),
  cancelAppointment: vi.fn(),
}));
vi.mock("@/actions/consultations", () => ({
  orderLabTest: vi.fn(),
}));
vi.mock("@/actions/billing", () => ({
  markPaid: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { bookAppointment, cancelAppointment } from "@/actions/appointments";
import { orderLabTest } from "@/actions/consultations";
import { markPaid } from "@/actions/billing";
import {
  createChatTools,
  PENDING_CONFIRMATION_MARKER,
  TOOLS_PER_ROLE,
  type ChatSession,
} from "@/lib/chat-tools";

const patientSession: ChatSession = {
  user: { id: "u-patient", role: "PATIENT", patientId: "own-patient" },
};
const doctorSession: ChatSession = {
  user: { id: "u-doctor", role: "DOCTOR", profileId: "doc-profile" },
};
const receptionistSession: ChatSession = {
  user: { id: "u-recept", role: "RECEPTIONIST" },
};

function toolsFor(session: ChatSession) {
  return createChatTools(session);
}

async function run(
  fn: ReturnType<ReturnType<typeof vi.fn>> | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any,
) {
  void fn;
  return execute(args, { toolCallId: "t1", messages: [] } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.appointment.findFirst as ReturnType<typeof vi.fn>).mockReset();
  (prisma.consultation.findFirst as ReturnType<typeof vi.fn>).mockReset();
});

describe("createChatTools — role filtering", () => {
  it("patient gets exactly the patient toolset", () => {
    const tools = toolsFor(patientSession);
    expect(Object.keys(tools).sort()).toEqual(
      TOOLS_PER_ROLE.PATIENT.slice().sort(),
    );
  });

  it("lab technician gets only 3 read tools", () => {
    const tools = toolsFor({ user: { id: "u", role: "LAB_TECHNICIAN" } });
    expect(Object.keys(tools)).toHaveLength(3);
    expect(tools.bookAppointment).toBeUndefined();
  });
});

describe("patient authorization — cross-patient access blocked", () => {
  it("getPatientAppointments rejects another patient's ID", async () => {
    const tools = toolsFor(patientSession);
    const res = await run(undefined, tools.getPatientAppointments.execute, {
      patientId: "someone-else",
    });
    expect(res).toMatch(/own records/i);
    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it("getPatientAppointments auto-uses the session patientId when none given", async () => {
    (prisma.appointment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      [],
    );
    const tools = toolsFor(patientSession);
    const res = await run(undefined, tools.getPatientAppointments.execute, {});
    expect(res).toMatch(/No appointments found/i);
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: "own-patient" } }),
    );
  });

  it("listPrescriptions rejects another patient's ID", async () => {
    const tools = toolsFor(patientSession);
    const res = await run(undefined, tools.listPrescriptions.execute, {
      patientId: "someone-else",
    });
    expect(res).toMatch(/own records/i);
  });
});

describe("doctor authorization — clinical relationship required", () => {
  it("getPatientAppointments denies a patient with no relationship", async () => {
    (prisma.appointment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );
    (prisma.consultation.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );
    const tools = toolsFor(doctorSession);
    const res = await run(undefined, tools.getPatientAppointments.execute, {
      patientId: "random-patient",
    });
    expect(res).toMatch(/no clinical relationship/i);
    expect(prisma.appointment.findMany).not.toHaveBeenCalled();
  });

  it("getPatientAppointments allows a patient the doctor has an appointment with", async () => {
    (prisma.appointment.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      { id: "appt-1" },
    );
    (prisma.appointment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      [],
    );
    const tools = toolsFor(doctorSession);
    const res = await run(undefined, tools.getPatientAppointments.execute, {
      patientId: "related-patient",
    });
    expect(res).toMatch(/No appointments found/i);
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: "related-patient" } }),
    );
  });
});

describe("doctor showTodaysAppointments — scoped to the doctor", () => {
  it("filters by doctorId for a doctor session", async () => {
    (prisma.appointment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      [],
    );
    const tools = toolsFor(doctorSession);
    await run(undefined, tools.showTodaysAppointments.execute, {});
    const call = (prisma.appointment.findMany as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(call.where.doctorId).toBe("doc-profile");
  });

  it("does NOT filter by doctorId for a receptionist session", async () => {
    (prisma.appointment.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
      [],
    );
    const tools = toolsFor(receptionistSession);
    await run(undefined, tools.showTodaysAppointments.execute, {});
    const call = (prisma.appointment.findMany as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(call.where.doctorId).toBeUndefined();
  });
});

describe("write tools — two-phase confirmation gate", () => {
  it("bookAppointment returns pending marker when confirm is false", async () => {
    const tools = toolsFor(receptionistSession);
    const res = await run(undefined, tools.bookAppointment.execute, {
      doctorId: "d1",
      date: "2026-01-01",
      startTime: "10:00",
      endTime: "10:30",
      confirm: false,
    });
    expect(res).toContain(PENDING_CONFIRMATION_MARKER);
    expect(bookAppointment).not.toHaveBeenCalled();
  });

  it("bookAppointment executes the action when confirm is true", async () => {
    (bookAppointment as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      appointment: {
        id: "a1",
        date: "2026-01-01",
        startTime: "10:00",
        endTime: "10:30",
        status: "CONFIRMED",
      },
    });
    const tools = toolsFor(receptionistSession);
    const res = await run(undefined, tools.bookAppointment.execute, {
      doctorId: "d1",
      date: "2026-01-01",
      startTime: "10:00",
      endTime: "10:30",
      confirm: true,
    });
    expect(res).toMatch(/booked successfully/i);
    expect(bookAppointment).toHaveBeenCalled();
  });

  it("cancelAppointment returns pending marker when confirm is false", async () => {
    const tools = toolsFor(patientSession);
    const res = await run(undefined, tools.cancelAppointment.execute, {
      appointmentId: "a1",
      confirm: false,
    });
    expect(res).toContain(PENDING_CONFIRMATION_MARKER);
    expect(cancelAppointment).not.toHaveBeenCalled();
  });

  it("recordPayment returns pending marker when confirm is false", async () => {
    const tools = toolsFor(receptionistSession);
    const res = await run(undefined, tools.recordPayment.execute, {
      invoiceId: "inv1",
      paymentMethod: "CASH",
      confirm: false,
    });
    expect(res).toContain(PENDING_CONFIRMATION_MARKER);
    expect(markPaid).not.toHaveBeenCalled();
  });

  it("orderLabTest returns pending marker when confirm is false", async () => {
    const tools = toolsFor(doctorSession);
    const res = await run(undefined, tools.orderLabTest.execute, {
      consultationId: "c1",
      patientId: "p1",
      testTypeId: "t1",
      priority: "NORMAL",
      confirm: false,
    });
    expect(res).toContain(PENDING_CONFIRMATION_MARKER);
    expect(orderLabTest).not.toHaveBeenCalled();
  });

  it("createPrescriptionItem blocks a prescription not owned by the doctor even when confirmed", async () => {
    (prisma.prescription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );
    const tools = toolsFor(doctorSession);
    const res = await run(
      undefined,
      tools.createPrescriptionItem.execute,
      {
        prescriptionId: "rx-other",
        medicineId: "m1",
        dosage: "1 tab",
        frequency: "OD",
        duration: "5 days",
        quantity: 5,
        confirm: true,
      },
    );
    expect(res).toMatch(/not your prescription/i);
    expect(prisma.prescriptionItem.create).not.toHaveBeenCalled();
  });
});
