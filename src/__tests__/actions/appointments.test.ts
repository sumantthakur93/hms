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
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  computeSlots,
  bookAppointment,
  getMyAppointments,
  rescheduleAppointment,
  cancelAppointment,
} from "@/actions/appointments";

const mockAuth = vi.mocked(auth) as unknown as {
  mockReset(): void;
  mockResolvedValue(value: any): void;
};

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
      id: "rec-id",
      role: "RECEPTIONIST" as const,
      name: "Test Receptionist",
      email: "test-receptionist@carepoint.in",
    },
    expires: new Date().toISOString(),
  } as any;
}

const validBooking = {
  doctorId: "doc1",
  date: "2024-03-15",
  startTime: "09:00",
  endTime: "09:30",
};

// ─── computeSlots ──────────────────────────────────────────────────────────────

describe("computeSlots", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.blockedDate.findUnique).mockReset();
    vi.mocked(prisma.scheduleBlock.findMany).mockReset();
    vi.mocked(prisma.appointment.findMany).mockReset();
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await computeSlots("doc1", "2024-03-15");
    expect(result.ok).toBe(false);
  });

  it("returns empty slots for blocked date", async () => {
    mockAuth.mockResolvedValue(patientSession());
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue({
      id: "bd1",
      doctorId: "doc1",
      date: new Date("2024-03-15"),
      reason: "Holiday",
    } as any);

    const result = await computeSlots("doc1", "2024-03-15");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slots).toEqual([]);
    }
  });

  it("returns empty slots when no schedule blocks", async () => {
    mockAuth.mockResolvedValue(patientSession());
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.scheduleBlock.findMany).mockResolvedValue([]);

    const result = await computeSlots("doc1", "2024-03-15");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slots).toEqual([]);
    }
  });

  it("generates slots from schedule blocks", async () => {
    mockAuth.mockResolvedValue(patientSession());
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.scheduleBlock.findMany).mockResolvedValue([
      {
        id: "b1",
        doctorId: "doc1",
        dayOfWeek: 5,
        startTime: "09:00",
        endTime: "11:00",
        slotDuration: 30,
      },
    ] as any);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    // 2024-03-15 is a Friday (day 5)
    const result = await computeSlots("doc1", "2024-03-15");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slots).toHaveLength(4);
      expect(result.slots[0]).toEqual({
        startTime: "09:00",
        endTime: "09:30",
        available: true,
      });
      expect(result.slots[3]).toEqual({
        startTime: "10:30",
        endTime: "11:00",
        available: true,
      });
    }
  });

  it("marks booked slots as unavailable", async () => {
    mockAuth.mockResolvedValue(patientSession());
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.scheduleBlock.findMany).mockResolvedValue([
      {
        id: "b1",
        doctorId: "doc1",
        dayOfWeek: 5,
        startTime: "09:00",
        endTime: "10:00",
        slotDuration: 30,
      },
    ] as any);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      { startTime: "09:00" },
    ] as any);

    const result = await computeSlots("doc1", "2024-03-15");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slots[0].available).toBe(false);
      expect(result.slots[1].available).toBe(true);
    }
  });

  it("filters out past slots when the date is today", async () => {
    mockAuth.mockResolvedValue(patientSession());
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.scheduleBlock.findMany).mockResolvedValue([
      {
        id: "b1",
        doctorId: "doc1",
        dayOfWeek: new Date().getDay(),
        startTime: "00:00",
        endTime: "23:59",
        slotDuration: 60,
      },
    ] as any);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })();
    const nowH = new Date().getHours();

    const result = await computeSlots("doc1", todayStr);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Every returned slot must start after the current hour
      for (const slot of result.slots) {
        const slotH = Number(slot.startTime.split(":")[0]);
        expect(slotH).toBeGreaterThan(nowH);
      }
    }
  });

  it("keeps all slots when the date is a future day", async () => {
    mockAuth.mockResolvedValue(patientSession());
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.scheduleBlock.findMany).mockResolvedValue([
      {
        id: "b1",
        doctorId: "doc1",
        dayOfWeek: 5,
        startTime: "09:00",
        endTime: "11:00",
        slotDuration: 30,
      },
    ] as any);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    // 2024-03-15 is a Friday (day 5) — a fixed past date so "isToday" is false
    const result = await computeSlots("doc1", "2024-03-15");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.slots).toHaveLength(4);
    }
  });
});

// ─── bookAppointment ───────────────────────────────────────────────────────────

describe("bookAppointment", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.blockedDate.findUnique).mockReset();
    vi.mocked(prisma.appointment.create).mockReset();
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(bookAppointment(validBooking)).rejects.toThrow("Unauthorized");
  });

  it("rejects non-patient/non-receptionist", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "a1", role: "ADMIN", name: "Admin" },
      expires: new Date().toISOString(),
    } as any);
    await expect(bookAppointment(validBooking)).rejects.toThrow("Unauthorized");
  });

  it("rejects patient without patientId", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "u1", role: "PATIENT", name: "P" },
      expires: new Date().toISOString(),
    } as any);
    const result = await bookAppointment(validBooking);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("patient profile");
    }
  });

  it("rejects blocked date", async () => {
    mockAuth.mockResolvedValue(patientSession());
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue({
      id: "bd1",
      doctorId: "doc1",
      date: new Date("2024-03-15"),
      reason: "Holiday",
    } as any);

    const result = await bookAppointment(validBooking);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("blocked");
    }
  });

  it("books successfully", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appointment.create).mockResolvedValue({
      id: "apt1",
      patientId: "p1",
      doctorId: "doc1",
      date: new Date("2024-03-15"),
      startTime: "09:00",
      endTime: "09:30",
      status: "CONFIRMED",
      reason: null,
    } as any);

    const result = await bookAppointment(validBooking);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.appointment.id).toBe("apt1");
      expect(prisma.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: "p1",
          doctorId: "doc1",
          startTime: "09:00",
          status: "CONFIRMED",
        }),
      });
    }
  });

  it("prevents double-booking", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appointment.create).mockRejectedValue(
      new Error("Unique constraint"),
    );

    const result = await bookAppointment(validBooking);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("already booked");
    }
  });

  it("rejects invalid input", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    const result = await bookAppointment({
      ...validBooking,
      startTime: "invalid",
    });
    expect(result.ok).toBe(false);
  });
});

// ─── getMyAppointments ─────────────────────────────────────────────────────────

describe("getMyAppointments", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.appointment.findMany).mockReset();
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getMyAppointments()).rejects.toThrow("Unauthorized");
  });

  it("rejects non-patient", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    await expect(getMyAppointments()).rejects.toThrow("Unauthorized");
  });

  it("returns appointments for the patient", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: "apt1",
        date: new Date("2024-03-15"),
        startTime: "09:00",
        endTime: "09:30",
        status: "CONFIRMED",
        reason: null,
        originalDate: null,
        originalTime: null,
        doctor: {
          user: { name: "Dr. Smith" },
          department: { name: "Cardiology", consultationFee: 1000 },
        },
      },
    ] as any);

    const result = await getMyAppointments();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.appointments).toHaveLength(1);
      expect(result.appointments[0].doctorName).toBe("Dr. Smith");
      expect(result.appointments[0].consultationFee).toBe(1000);
    }
  });
});

// ─── rescheduleAppointment ─────────────────────────────────────────────────────

describe("rescheduleAppointment", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.appointment.findUnique).mockReset();
    vi.mocked(prisma.appointment.delete).mockReset();
    vi.mocked(prisma.appointment.create).mockReset();
    vi.mocked(prisma.blockedDate.findUnique).mockReset();
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(
      rescheduleAppointment({
        appointmentId: "apt1",
        newDate: "2024-03-20",
        newStartTime: "10:00",
        newEndTime: "10:30",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("rejects rescheduling non-existent appointment", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null);

    const result = await rescheduleAppointment({
      appointmentId: "apt1",
      newDate: "2024-03-20",
      newStartTime: "10:00",
      newEndTime: "10:30",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("not found");
    }
  });

  it("rejects rescheduling another patient's appointment", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt1",
      patientId: "p2",
      doctorId: "doc1",
      date: new Date("2024-03-15"),
      startTime: "09:00",
      endTime: "09:30",
      status: "CONFIRMED",
      reason: null,
    } as any);

    const result = await rescheduleAppointment({
      appointmentId: "apt1",
      newDate: "2024-03-20",
      newStartTime: "10:00",
      newEndTime: "10:30",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Unauthorized");
    }
  });

  it("rejects rescheduling non-confirmed appointment", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt1",
      patientId: "p1",
      doctorId: "doc1",
      date: new Date("2024-03-15"),
      startTime: "09:00",
      endTime: "09:30",
      status: "COMPLETED",
      reason: null,
    } as any);

    const result = await rescheduleAppointment({
      appointmentId: "apt1",
      newDate: "2024-03-20",
      newStartTime: "10:00",
      newEndTime: "10:30",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("confirmed");
    }
  });

  it("reschedules successfully and records original date/time", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    const origDate = new Date("2024-03-15");
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt1",
      patientId: "p1",
      doctorId: "doc1",
      date: origDate,
      startTime: "09:00",
      endTime: "09:30",
      status: "CONFIRMED",
      reason: "Checkup",
    } as any);
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appointment.delete).mockResolvedValue({} as any);
    vi.mocked(prisma.appointment.create).mockResolvedValue({
      id: "apt2",
      patientId: "p1",
      doctorId: "doc1",
      date: new Date("2024-03-20"),
      startTime: "10:00",
      endTime: "10:30",
      status: "CONFIRMED",
      originalDate: origDate,
      originalTime: "09:00",
      reason: "Checkup",
    } as any);

    const result = await rescheduleAppointment({
      appointmentId: "apt1",
      newDate: "2024-03-20",
      newStartTime: "10:00",
      newEndTime: "10:30",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.appointment.id).toBe("apt2");
    }
    // Verify create was called with originalDate/originalTime
    const createCall = vi.mocked(prisma.appointment.create).mock.calls[0][0];
    expect(createCall.data).toMatchObject({
      originalDate: origDate,
      originalTime: "09:00",
    });
  });

  it("rejects reschedule to blocked date", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt1",
      patientId: "p1",
      doctorId: "doc1",
      date: new Date("2024-03-15"),
      startTime: "09:00",
      endTime: "09:30",
      status: "CONFIRMED",
      reason: null,
    } as any);
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue({
      id: "bd1",
      doctorId: "doc1",
      date: new Date("2024-03-20"),
      reason: "Leave",
    } as any);

    const result = await rescheduleAppointment({
      appointmentId: "apt1",
      newDate: "2024-03-20",
      newStartTime: "10:00",
      newEndTime: "10:30",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("blocked");
    }
  });
});

// ─── cancelAppointment ─────────────────────────────────────────────────────────

describe("cancelAppointment", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.appointment.findUnique).mockReset();
    vi.mocked(prisma.appointment.update).mockReset();
  });

  it("rejects unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(cancelAppointment("apt1")).rejects.toThrow("Unauthorized");
  });

  it("rejects cancelling non-existent appointment", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue(null);

    const result = await cancelAppointment("apt1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("not found");
    }
  });

  it("rejects cancelling another patient's appointment", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt1",
      patientId: "p2",
      doctorId: "doc1",
      date: new Date("2024-03-15"),
      startTime: "09:00",
      endTime: "09:30",
      status: "CONFIRMED",
    } as any);

    const result = await cancelAppointment("apt1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Unauthorized");
    }
  });

  it("rejects cancelling non-confirmed appointment", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt1",
      patientId: "p1",
      doctorId: "doc1",
      date: new Date("2024-03-15"),
      startTime: "09:00",
      endTime: "09:30",
      status: "COMPLETED",
    } as any);

    const result = await cancelAppointment("apt1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("confirmed");
    }
  });

  it("cancels successfully", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "apt1",
      patientId: "p1",
      doctorId: "doc1",
      date: new Date("2024-03-15"),
      startTime: "09:00",
      endTime: "09:30",
      status: "CONFIRMED",
    } as any);
    vi.mocked(prisma.appointment.update).mockResolvedValue({
      id: "apt1",
      status: "CANCELLED",
      cancelledAt: new Date(),
    } as any);

    const result = await cancelAppointment("apt1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.appointment.status).toBe("CANCELLED");
    }
    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: "apt1" },
      data: expect.objectContaining({
        status: "CANCELLED",
        cancelledAt: expect.any(Date),
      }),
    });
  });
});
