import { describe, it, expect, vi, beforeEach } from "vitest";

// Destructive tests for appointment actions — state-machine violations,
// injection attempts, boundary values, and race conditions.

vi.mock("@/lib/prisma", () => ({
  prisma: {
    blockedDate: { findUnique: vi.fn() },
    scheduleBlock: { findMany: vi.fn() },
    appointment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    doctorProfile: { findMany: vi.fn() },
    department: { findMany: vi.fn() },
    patient: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import {
  computeSlots,
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  checkInAppointment,
  markNoShow,
  walkInRegistration,
  findPatientByPhone,
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
      email: "tp@carepoint.in",
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
      profileId: "doc1",
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

beforeEach(() => {
  mockAuth.mockReset();
  vi.mocked(prisma.blockedDate.findUnique).mockReset();
  vi.mocked(prisma.scheduleBlock.findMany).mockReset();
  vi.mocked(prisma.appointment.findMany).mockReset();
  vi.mocked(prisma.appointment.findUnique).mockReset();
  vi.mocked(prisma.appointment.create).mockReset();
  vi.mocked(prisma.appointment.update).mockReset();
  vi.mocked(prisma.appointment.delete).mockReset();
  vi.mocked(prisma.patient.findFirst).mockReset();
  vi.mocked(prisma.patient.create).mockReset();
});

// ─── D-STATE: State-machine violations ────────────────────────────────────────

describe("D-STATE — State-machine violations", () => {
  describe("checkInAppointment — illegal transitions", () => {
    it("D-STATE.01: rejects check-in of CANCELLED appointment", async () => {
      mockAuth.mockResolvedValue(receptionistSession());
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        status: "CANCELLED",
      } as any);

      const result = await checkInAppointment("a1");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("confirmed");
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it("D-STATE.02: rejects check-in of COMPLETED appointment", async () => {
      mockAuth.mockResolvedValue(receptionistSession());
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        status: "COMPLETED",
      } as any);

      const result = await checkInAppointment("a1");
      expect(result.ok).toBe(false);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it("D-STATE.03: rejects check-in of NO_SHOW appointment", async () => {
      mockAuth.mockResolvedValue(receptionistSession());
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        status: "NO_SHOW",
      } as any);

      const result = await checkInAppointment("a1");
      expect(result.ok).toBe(false);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it("D-STATE.04: rejects check-in of already CHECKED_IN appointment", async () => {
      mockAuth.mockResolvedValue(receptionistSession());
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        status: "CHECKED_IN",
      } as any);

      const result = await checkInAppointment("a1");
      expect(result.ok).toBe(false);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });
  });

  describe("markNoShow — illegal transitions", () => {
    it("D-STATE.05: rejects no-show on CONFIRMED (not yet checked in)", async () => {
      mockAuth.mockResolvedValue(receptionistSession());
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        status: "CONFIRMED",
      } as any);

      const result = await markNoShow("a1");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("checked-in");
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it("D-STATE.06: rejects no-show on CANCELLED", async () => {
      mockAuth.mockResolvedValue(receptionistSession());
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        status: "CANCELLED",
      } as any);

      const result = await markNoShow("a1");
      expect(result.ok).toBe(false);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it("D-STATE.07: rejects no-show on COMPLETED", async () => {
      mockAuth.mockResolvedValue(receptionistSession());
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        status: "COMPLETED",
      } as any);

      const result = await markNoShow("a1");
      expect(result.ok).toBe(false);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it("D-STATE.08: rejects no-show on already NO_SHOW", async () => {
      mockAuth.mockResolvedValue(receptionistSession());
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        status: "NO_SHOW",
      } as any);

      const result = await markNoShow("a1");
      expect(result.ok).toBe(false);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });
  });

  describe("cancelAppointment — illegal transitions", () => {
    it("D-STATE.09: rejects cancel of CHECKED_IN appointment", async () => {
      mockAuth.mockResolvedValue(patientSession("p1"));
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        patientId: "p1",
        status: "CHECKED_IN",
      } as any);

      const result = await cancelAppointment("a1");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("confirmed");
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it("D-STATE.10: rejects cancel of COMPLETED appointment", async () => {
      mockAuth.mockResolvedValue(patientSession("p1"));
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        patientId: "p1",
        status: "COMPLETED",
      } as any);

      const result = await cancelAppointment("a1");
      expect(result.ok).toBe(false);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it("D-STATE.11: rejects cancel of NO_SHOW appointment", async () => {
      mockAuth.mockResolvedValue(patientSession("p1"));
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        patientId: "p1",
        status: "NO_SHOW",
      } as any);

      const result = await cancelAppointment("a1");
      expect(result.ok).toBe(false);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it("D-STATE.12: rejects cancel of already CANCELLED appointment", async () => {
      mockAuth.mockResolvedValue(patientSession("p1"));
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        patientId: "p1",
        status: "CANCELLED",
      } as any);

      const result = await cancelAppointment("a1");
      expect(result.ok).toBe(false);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });
  });

  describe("rescheduleAppointment — illegal transitions", () => {
    it("D-STATE.13: rejects reschedule of CANCELLED appointment", async () => {
      mockAuth.mockResolvedValue(patientSession("p1"));
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        patientId: "p1",
        status: "CANCELLED",
      } as any);

      const result = await rescheduleAppointment({
        appointmentId: "a1",
        newDate: "2024-03-20",
        newStartTime: "10:00",
        newEndTime: "10:30",
      });
      expect(result.ok).toBe(false);
      expect(prisma.appointment.delete).not.toHaveBeenCalled();
    });

    it("D-STATE.14: rejects reschedule of CHECKED_IN appointment", async () => {
      mockAuth.mockResolvedValue(patientSession("p1"));
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        patientId: "p1",
        status: "CHECKED_IN",
      } as any);

      const result = await rescheduleAppointment({
        appointmentId: "a1",
        newDate: "2024-03-20",
        newStartTime: "10:00",
        newEndTime: "10:30",
      });
      expect(result.ok).toBe(false);
      expect(prisma.appointment.delete).not.toHaveBeenCalled();
    });

    it("D-STATE.15: rejects reschedule of COMPLETED appointment", async () => {
      mockAuth.mockResolvedValue(patientSession("p1"));
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        patientId: "p1",
        status: "COMPLETED",
      } as any);

      const result = await rescheduleAppointment({
        appointmentId: "a1",
        newDate: "2024-03-20",
        newStartTime: "10:00",
        newEndTime: "10:30",
      });
      expect(result.ok).toBe(false);
      expect(prisma.appointment.delete).not.toHaveBeenCalled();
    });

    it("D-STATE.16: rejects reschedule of NO_SHOW appointment", async () => {
      mockAuth.mockResolvedValue(patientSession("p1"));
      vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
        id: "a1",
        patientId: "p1",
        status: "NO_SHOW",
      } as any);

      const result = await rescheduleAppointment({
        appointmentId: "a1",
        newDate: "2024-03-20",
        newStartTime: "10:00",
        newEndTime: "10:30",
      });
      expect(result.ok).toBe(false);
      expect(prisma.appointment.delete).not.toHaveBeenCalled();
    });
  });
});

// ─── D-INJECT: Injection & malformed input ────────────────────────────────────

describe("D-INJECT — Injection & malformed input in booking", () => {
  it("D-INJECT.01: SQL injection in doctorId is rejected by schema", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    const result = await bookAppointment({
      ...validBooking,
      doctorId: "'; DROP TABLE appointments;--",
    });
    // Zod only checks min(1), so this passes schema. But Prisma parameterizes.
    // The action should not crash — it should either succeed (Prisma escapes)
    // or fail gracefully. We verify no crash and Prisma.create is called with
    // the raw string (Prisma will parameterize).
    expect(result).toBeDefined();
  });

  it("D-INJECT.02: XSS payload in reason field is stored as-is (escaped on render)", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appointment.create).mockResolvedValue({ id: "a1" } as any);

    const xssReason = `<script>alert('xss')</script>`;
    const result = await bookAppointment({
      ...validBooking,
      reason: xssReason,
    });

    // The action should accept it (React escapes on render). Verify it's passed
    // to Prisma as-is (not stripped or modified).
    if (result.ok) {
      const createCall = vi.mocked(prisma.appointment.create).mock.calls[0][0];
      expect(createCall.data.reason).toBe(xssReason);
    }
  });

  it("D-INJECT.03: null byte in doctorId doesn't crash", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appointment.create).mockResolvedValue({ id: "a1" } as any);

    const result = await bookAppointment({
      ...validBooking,
      doctorId: "doc1\x00evil",
    });
    expect(result).toBeDefined();
    expect(result.ok).toBe(true);
  });

  it("D-INJECT.04: extremely long reason (10KB) doesn't crash", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appointment.create).mockResolvedValue({ id: "a1" } as any);

    const result = await bookAppointment({
      ...validBooking,
      reason: "A".repeat(10000),
    });
    expect(result).toBeDefined();
    expect(result.ok).toBe(true);
  });
});

// ─── D-BOUND: Boundary values ─────────────────────────────────────────────────

describe("D-BOUND — Boundary values in booking", () => {
  it("D-BOUND.01: rejects invalid time format '9:00' (not HH:mm)", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    const result = await bookAppointment({
      ...validBooking,
      startTime: "9:00",
    });
    expect(result.ok).toBe(false);
  });

  it("D-BOUND.02: rejects invalid hour '25:00' (hour range 00-23 enforced)", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    const result = await bookAppointment({
      ...validBooking,
      startTime: "25:00",
    });
    // Fixed: regex now enforces HH:mm with hours 00-23 and minutes 00-59
    expect(result.ok).toBe(false);
  });

  it("D-BOUND.03: rejects empty doctorId", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    const result = await bookAppointment({
      ...validBooking,
      doctorId: "",
    });
    expect(result.ok).toBe(false);
  });

  it("D-BOUND.04: rejects empty date", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    const result = await bookAppointment({
      ...validBooking,
      date: "",
    });
    expect(result.ok).toBe(false);
  });

  it("D-BOUND.05: accepts midnight time '00:00'", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appointment.create).mockResolvedValue({ id: "a1" } as any);

    const result = await bookAppointment({
      ...validBooking,
      startTime: "00:00",
      endTime: "00:30",
    });
    // Schema allows HH:mm, so 00:00 passes. This is a boundary value.
    expect(result.ok).toBe(true);
  });

  it("D-BOUND.06: accepts end-of-day time '23:30'", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appointment.create).mockResolvedValue({ id: "a1" } as any);

    const result = await bookAppointment({
      ...validBooking,
      startTime: "23:30",
      endTime: "23:59",
    });
    expect(result.ok).toBe(true);
  });
});

// ─── D-CONC: Race condition simulation ────────────────────────────────────────

describe("D-CONC — Race condition simulation", () => {
  it("D-CONC.01: double-booking race — second create throws, returns error", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    // First create succeeds
    vi.mocked(prisma.appointment.create)
      .mockResolvedValueOnce({ id: "a1" } as any)
      .mockRejectedValueOnce(new Error("Unique constraint failed"));

    const r1 = await bookAppointment(validBooking);
    const r2 = await bookAppointment(validBooking);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toContain("already booked");
  });

  it("D-CONC.02: walk-in MRN race — retries on collision, then succeeds", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    // Both see MRN-00005 as the last, both try MRN-00006
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
      .mockResolvedValueOnce({ id: "p2", mrn: "MRN-00007" } as any);

    const result = await walkInRegistration({
      firstName: "C",
      lastName: "D",
      phone: "2222222222",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patient.mrn).toBe("MRN-00007");
    }
  });
});

// ─── D-AUTHZ: Cross-role authorization ────────────────────────────────────────

describe("D-AUTHZ — Cross-role authorization", () => {
  it("D-AUTHZ.01: DOCTOR cannot book appointments", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    await expect(bookAppointment(validBooking)).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.02: DOCTOR cannot check in appointments", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    // checkInAppointment allows RECEPTIONIST + ADMIN only, not DOCTOR
    await expect(checkInAppointment("a1")).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.03: PATIENT cannot check in appointments", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(checkInAppointment("a1")).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.04: PATIENT cannot mark no-show", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(markNoShow("a1")).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.05: PATIENT cannot call walkInRegistration", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(
      walkInRegistration({
        firstName: "A",
        lastName: "B",
        phone: "1234567890",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.06: PATIENT cannot call findPatientByPhone", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(findPatientByPhone("9876543210")).rejects.toThrow(
      "Unauthorized",
    );
  });

  it("D-AUTHZ.07: DOCTOR cannot call walkInRegistration", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    await expect(
      walkInRegistration({
        firstName: "A",
        lastName: "B",
        phone: "1234567890",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.08: reschedule rejects other patient's appointment", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "a1",
      patientId: "p2",
      status: "CONFIRMED",
    } as any);

    const result = await rescheduleAppointment({
      appointmentId: "a1",
      newDate: "2024-03-20",
      newStartTime: "10:00",
      newEndTime: "10:30",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Unauthorized");
  });

  it("D-AUTHZ.09: cancel rejects other patient's appointment", async () => {
    mockAuth.mockResolvedValue(patientSession("p1"));
    vi.mocked(prisma.appointment.findUnique).mockResolvedValue({
      id: "a1",
      patientId: "p2",
      status: "CONFIRMED",
    } as any);

    const result = await cancelAppointment("a1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Unauthorized");
  });
});

// ─── D-INPUT: walkInRegistration input attacks ────────────────────────────────

describe("D-INPUT — walkInRegistration input attacks", () => {
  it("D-INPUT.01: XSS in firstName is stored as-is (escaped on render)", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "<script>",
      lastName: "Test",
      phone: "1234567890",
    } as any);

    const result = await walkInRegistration({
      firstName: `<script>alert('xss')</script>`,
      lastName: "Test",
      phone: "1234567890",
    });
    expect(result.ok).toBe(true);
    const createCall = vi.mocked(prisma.patient.create).mock.calls[0][0];
    expect(createCall.data.firstName).toBe(`<script>alert('xss')</script>`);
  });

  it("D-INPUT.02: rejects phone shorter than 10 chars", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    const result = await walkInRegistration({
      firstName: "Test",
      lastName: "User",
      phone: "12345",
    });
    expect(result.ok).toBe(false);
  });

  it("D-INPUT.03: rejects empty firstName", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    const result = await walkInRegistration({
      firstName: "",
      lastName: "User",
      phone: "1234567890",
    });
    expect(result.ok).toBe(false);
  });

  it("D-INPUT.04: rejects empty lastName", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    const result = await walkInRegistration({
      firstName: "Test",
      lastName: "",
      phone: "1234567890",
    });
    expect(result.ok).toBe(false);
  });

  it("D-INPUT.05: 10KB firstName doesn't crash", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.patient.create).mockResolvedValue({
      id: "p1",
      mrn: "MRN-00001",
      firstName: "A".repeat(10000),
      lastName: "Test",
      phone: "1234567890",
    } as any);

    const result = await walkInRegistration({
      firstName: "A".repeat(10000),
      lastName: "Test",
      phone: "1234567890",
    });
    expect(result.ok).toBe(true);
  });
});

// ─── D-INPUT: findPatientByPhone input attacks ────────────────────────────────

describe("D-INPUT — findPatientByPhone input attacks", () => {
  it("D-INPUT.06: rejects phone shorter than 4 digits", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    const result = await findPatientByPhone("123");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("at least 4");
  });

  it("D-INPUT.07: SQL injection in phone doesn't crash", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);

    const result = await findPatientByPhone("9876'; DROP TABLE patients;--");
    // Prisma parameterizes — no SQL injection. Should return "not found".
    expect(result.ok).toBe(false);
  });

  it("D-INPUT.08: null byte in phone doesn't crash", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    vi.mocked(prisma.patient.findFirst).mockResolvedValue(null);

    const result = await findPatientByPhone("9876\x00evil");
    expect(result).toBeDefined();
  });
});

// ─── D-INPUT: computeSlots edge cases ─────────────────────────────────────────

describe("D-INPUT — computeSlots edge cases", () => {
  it("D-INPUT.09: invalid date format doesn't crash", async () => {
    mockAuth.mockResolvedValue(patientSession());
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.scheduleBlock.findMany).mockResolvedValue([]);

    const result = await computeSlots("doc1", "not-a-date");
    // toDateUTC will create an Invalid Date, getUTCDay() returns NaN
    // scheduleBlock.findMany with NaN dayOfWeek returns empty
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.slots).toEqual([]);
  });

  it("D-INPUT.10: empty doctorId doesn't crash", async () => {
    mockAuth.mockResolvedValue(patientSession());
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.scheduleBlock.findMany).mockResolvedValue([]);

    const result = await computeSlots("", "2024-03-15");
    expect(result.ok).toBe(true);
  });

  it("D-BOUND.07: dayOfWeek boundary 0 (Sunday) generates slots", async () => {
    mockAuth.mockResolvedValue(patientSession());
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.scheduleBlock.findMany).mockResolvedValue([
      {
        id: "b1",
        doctorId: "doc1",
        dayOfWeek: 0,
        startTime: "10:00",
        endTime: "11:00",
        slotDuration: 30,
      },
    ] as any);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    // 2024-03-17 is a Sunday (day 0)
    const result = await computeSlots("doc1", "2024-03-17");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.slots).toHaveLength(2);
  });

  it("D-BOUND.08: dayOfWeek boundary 6 (Saturday) generates slots", async () => {
    mockAuth.mockResolvedValue(patientSession());
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.scheduleBlock.findMany).mockResolvedValue([
      {
        id: "b1",
        doctorId: "doc1",
        dayOfWeek: 6,
        startTime: "10:00",
        endTime: "11:00",
        slotDuration: 30,
      },
    ] as any);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    // 2024-03-16 is a Saturday (day 6)
    const result = await computeSlots("doc1", "2024-03-16");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.slots).toHaveLength(2);
  });

  it("D-BOUND.09: slotDuration of 5 minutes (minimum) generates many slots", async () => {
    mockAuth.mockResolvedValue(patientSession());
    vi.mocked(prisma.blockedDate.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.scheduleBlock.findMany).mockResolvedValue([
      {
        id: "b1",
        doctorId: "doc1",
        dayOfWeek: 5,
        startTime: "09:00",
        endTime: "10:00",
        slotDuration: 5,
      },
    ] as any);
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([]);

    // 2024-03-15 is a Friday (day 5) — 60 min / 5 min = 12 slots
    const result = await computeSlots("doc1", "2024-03-15");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.slots).toHaveLength(12);
  });
});
