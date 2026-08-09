import { describe, it, expect, vi, beforeEach } from "vitest";

// Destructive tests for schedule actions — boundary values, injection,
// and cross-role authorization.

vi.mock("@/lib/prisma", () => ({
  prisma: {
    doctorProfile: { findMany: vi.fn() },
    scheduleBlock: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    blockedDate: { create: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  getDoctors,
  createScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
  addBlockedDate,
  removeBlockedDate,
} from "@/actions/schedule";

const mockAuth = vi.mocked(auth) as unknown as {
  mockReset(): void;
  mockResolvedValue(value: any): void;
};

function adminSession() {
  return {
    user: { id: "admin-id", role: "ADMIN" as const, name: "Admin", email: "admin@carepoint.in" },
    expires: new Date().toISOString(),
  } as any;
}

function receptionistSession() {
  return {
    user: { id: "rec-id", role: "RECEPTIONIST" as const, name: "Rec", email: "rec@carepoint.in" },
    expires: new Date().toISOString(),
  } as any;
}

function doctorSession() {
  return {
    user: { id: "doc-id", role: "DOCTOR" as const, name: "Dr. Test", email: "doc@carepoint.in" },
    expires: new Date().toISOString(),
  } as any;
}

function patientSession() {
  return {
    user: { id: "pat-id", role: "PATIENT" as const, name: "Pat", email: "pat@carepoint.in" },
    expires: new Date().toISOString(),
  } as any;
}

const validInput = {
  doctorId: "doc1",
  dayOfWeek: 1,
  startTime: "09:00",
  endTime: "13:00",
  slotDuration: 30,
};

beforeEach(() => {
  mockAuth.mockReset();
  vi.mocked(prisma.doctorProfile.findMany).mockReset();
  vi.mocked(prisma.scheduleBlock.create).mockReset();
  vi.mocked(prisma.scheduleBlock.update).mockReset();
  vi.mocked(prisma.scheduleBlock.delete).mockReset();
  vi.mocked(prisma.blockedDate.create).mockReset();
  vi.mocked(prisma.blockedDate.delete).mockReset();
});

// ─── D-BOUND: Boundary values ─────────────────────────────────────────────────

describe("D-BOUND — Schedule boundary values", () => {
  describe("createScheduleBlock", () => {
    it("D-BOUND.01: rejects dayOfWeek = 7 (out of range, max is 6)", async () => {
      mockAuth.mockResolvedValue(adminSession());
      const result = await createScheduleBlock({ ...validInput, dayOfWeek: 7 } as any);
      expect(result.ok).toBe(false);
    });

    it("D-BOUND.02: rejects dayOfWeek = -1 (out of range, min is 0)", async () => {
      mockAuth.mockResolvedValue(adminSession());
      const result = await createScheduleBlock({ ...validInput, dayOfWeek: -1 } as any);
      expect(result.ok).toBe(false);
    });

    it("D-BOUND.03: accepts dayOfWeek = 0 (Sunday, boundary)", async () => {
      mockAuth.mockResolvedValue(adminSession());
      vi.mocked(prisma.scheduleBlock.create).mockResolvedValue({ id: "b1", ...validInput, dayOfWeek: 0 } as any);
      const result = await createScheduleBlock({ ...validInput, dayOfWeek: 0 });
      expect(result.ok).toBe(true);
    });

    it("D-BOUND.04: accepts dayOfWeek = 6 (Saturday, boundary)", async () => {
      mockAuth.mockResolvedValue(adminSession());
      vi.mocked(prisma.scheduleBlock.create).mockResolvedValue({ id: "b1", ...validInput, dayOfWeek: 6 } as any);
      const result = await createScheduleBlock({ ...validInput, dayOfWeek: 6 });
      expect(result.ok).toBe(true);
    });

    it("D-BOUND.05: rejects slotDuration = 4 (below min of 5)", async () => {
      mockAuth.mockResolvedValue(adminSession());
      const result = await createScheduleBlock({ ...validInput, slotDuration: 4 } as any);
      expect(result.ok).toBe(false);
    });

    it("D-BOUND.06: accepts slotDuration = 5 (minimum boundary)", async () => {
      mockAuth.mockResolvedValue(adminSession());
      vi.mocked(prisma.scheduleBlock.create).mockResolvedValue({ id: "b1", ...validInput, slotDuration: 5 } as any);
      const result = await createScheduleBlock({ ...validInput, slotDuration: 5 });
      expect(result.ok).toBe(true);
    });

    it("D-BOUND.07: rejects slotDuration = 121 (above max of 120)", async () => {
      mockAuth.mockResolvedValue(adminSession());
      const result = await createScheduleBlock({ ...validInput, slotDuration: 121 } as any);
      expect(result.ok).toBe(false);
    });

    it("D-BOUND.08: accepts slotDuration = 120 (maximum boundary)", async () => {
      mockAuth.mockResolvedValue(adminSession());
      vi.mocked(prisma.scheduleBlock.create).mockResolvedValue({ id: "b1", ...validInput, slotDuration: 120 } as any);
      const result = await createScheduleBlock({ ...validInput, slotDuration: 120 });
      expect(result.ok).toBe(true);
    });

    it("D-BOUND.09: rejects startTime after endTime", async () => {
      mockAuth.mockResolvedValue(adminSession());
      const result = await createScheduleBlock({
        ...validInput,
        startTime: "14:00",
        endTime: "09:00",
      });
      expect(result.ok).toBe(false);
    });

    it("D-BOUND.10: rejects startTime equals endTime (zero duration)", async () => {
      mockAuth.mockResolvedValue(adminSession());
      const result = await createScheduleBlock({
        ...validInput,
        startTime: "09:00",
        endTime: "09:00",
      });
      expect(result.ok).toBe(false);
    });

    it("D-BOUND.11: rejects invalid time format '9:00' (not HH:mm)", async () => {
      mockAuth.mockResolvedValue(adminSession());
      const result = await createScheduleBlock({ ...validInput, startTime: "9:00" } as any);
      expect(result.ok).toBe(false);
    });

    it("D-BOUND.12: rejects non-integer slotDuration", async () => {
      mockAuth.mockResolvedValue(adminSession());
      const result = await createScheduleBlock({ ...validInput, slotDuration: 30.5 } as any);
      expect(result.ok).toBe(false);
    });

    it("D-BOUND.13: rejects empty doctorId", async () => {
      mockAuth.mockResolvedValue(adminSession());
      const result = await createScheduleBlock({ ...validInput, doctorId: "" });
      expect(result.ok).toBe(false);
    });

    it("D-BOUND.14: accepts midnight boundary '00:00' as startTime", async () => {
      mockAuth.mockResolvedValue(adminSession());
      vi.mocked(prisma.scheduleBlock.create).mockResolvedValue({ id: "b1" } as any);
      const result = await createScheduleBlock({
        ...validInput,
        startTime: "00:00",
        endTime: "06:00",
      });
      expect(result.ok).toBe(true);
    });

    it("D-BOUND.15: accepts end-of-day '23:59' as endTime", async () => {
      mockAuth.mockResolvedValue(adminSession());
      vi.mocked(prisma.scheduleBlock.create).mockResolvedValue({ id: "b1" } as any);
      const result = await createScheduleBlock({
        ...validInput,
        startTime: "18:00",
        endTime: "23:59",
      });
      expect(result.ok).toBe(true);
    });
  });

  describe("updateScheduleBlock", () => {
    it("D-BOUND.16: rejects update with invalid dayOfWeek", async () => {
      mockAuth.mockResolvedValue(adminSession());
      const result = await updateScheduleBlock("b1", { ...validInput, dayOfWeek: 7 } as any);
      expect(result.ok).toBe(false);
    });

    it("D-BOUND.17: rejects update with startTime after endTime", async () => {
      mockAuth.mockResolvedValue(adminSession());
      const result = await updateScheduleBlock("b1", {
        ...validInput,
        startTime: "14:00",
        endTime: "09:00",
      });
      expect(result.ok).toBe(false);
    });
  });
});

// ─── D-INJECT: Injection & XSS ────────────────────────────────────────────────

describe("D-INJECT — Schedule injection & XSS", () => {
  it("D-INJECT.01: SQL injection in doctorId is parameterized by Prisma", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.scheduleBlock.create).mockResolvedValue({ id: "b1" } as any);

    const result = await createScheduleBlock({
      ...validInput,
      doctorId: "'; DROP TABLE schedule_blocks;--",
    });
    // Zod only checks min(1), so it passes schema. Prisma parameterizes.
    expect(result.ok).toBe(true);
  });

  it("D-INJECT.02: XSS in blocked date reason is stored as-is", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.blockedDate.create).mockResolvedValue({
      id: "bd1", doctorId: "doc1", date: new Date("2024-01-01"), reason: "<script>",
    } as any);

    const xss = `<script>alert('xss')</script>`;
    const result = await addBlockedDate({
      doctorId: "doc1",
      date: "2024-01-01",
      reason: xss,
    });
    expect(result.ok).toBe(true);
    const createCall = vi.mocked(prisma.blockedDate.create).mock.calls[0][0];
    expect(createCall.data.reason).toBe(xss);
  });

  it("D-INJECT.03: null byte in doctorId doesn't crash", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.scheduleBlock.create).mockResolvedValue({ id: "b1" } as any);

    const result = await createScheduleBlock({
      ...validInput,
      doctorId: "doc1\x00evil",
    });
    expect(result.ok).toBe(true);
  });

  it("D-INJECT.04: 10KB reason in addBlockedDate doesn't crash", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.blockedDate.create).mockResolvedValue({
      id: "bd1", doctorId: "doc1", date: new Date("2024-01-01"), reason: "A".repeat(10000),
    } as any);

    const result = await addBlockedDate({
      doctorId: "doc1",
      date: "2024-01-01",
      reason: "A".repeat(10000),
    });
    expect(result.ok).toBe(true);
  });
});

// ─── D-AUTHZ: Cross-role authorization ────────────────────────────────────────

describe("D-AUTHZ — Schedule cross-role authorization", () => {
  it("D-AUTHZ.01: RECEPTIONIST cannot getDoctors", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    await expect(getDoctors()).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.02: DOCTOR cannot getDoctors", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    await expect(getDoctors()).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.03: PATIENT cannot getDoctors", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(getDoctors()).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.04: RECEPTIONIST cannot createScheduleBlock", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    await expect(createScheduleBlock(validInput as any)).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.05: DOCTOR cannot createScheduleBlock", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    await expect(createScheduleBlock(validInput as any)).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.06: PATIENT cannot createScheduleBlock", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(createScheduleBlock(validInput as any)).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.07: RECEPTIONIST cannot updateScheduleBlock", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    await expect(updateScheduleBlock("b1", validInput)).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.08: RECEPTIONIST cannot deleteScheduleBlock", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    await expect(deleteScheduleBlock("b1")).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.09: RECEPTIONIST cannot addBlockedDate", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    await expect(addBlockedDate({ doctorId: "d1", date: "2024-01-01" } as any)).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.10: RECEPTIONIST cannot removeBlockedDate", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    await expect(removeBlockedDate("bd1")).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.11: DOCTOR cannot addBlockedDate", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    await expect(addBlockedDate({ doctorId: "d1", date: "2024-01-01" } as any)).rejects.toThrow("Unauthorized");
  });

  it("D-AUTHZ.12: PATIENT cannot removeBlockedDate", async () => {
    mockAuth.mockResolvedValue(patientSession());
    await expect(removeBlockedDate("bd1")).rejects.toThrow("Unauthorized");
  });
});

// ─── D-INPUT: Extreme inputs ──────────────────────────────────────────────────

describe("D-INPUT — Schedule extreme inputs", () => {
  it("D-INPUT.01: 10KB doctorId doesn't crash", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.scheduleBlock.create).mockResolvedValue({ id: "b1" } as any);

    const result = await createScheduleBlock({
      ...validInput,
      doctorId: "A".repeat(10000),
    });
    expect(result.ok).toBe(true);
  });

  it("D-INPUT.02: invalid date format in addBlockedDate doesn't crash", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.blockedDate.create).mockResolvedValue({
      id: "bd1", doctorId: "doc1", date: new Date("invalid"), reason: null,
    } as any);

    const result = await addBlockedDate({
      doctorId: "doc1",
      date: "not-a-date",
    });
    // Zod only checks min(1) on date string, so it passes schema.
    // new Date("not-a-date") creates Invalid Date — Prisma may reject.
    // The action should not crash.
    expect(result).toBeDefined();
  });

  it("D-INPUT.03: empty date in addBlockedDate is rejected", async () => {
    mockAuth.mockResolvedValue(adminSession());
    const result = await addBlockedDate({
      doctorId: "doc1",
      date: "",
    });
    expect(result.ok).toBe(false);
  });
});

// ─── D-CONC: Race condition simulation ────────────────────────────────────────

describe("D-CONC — Schedule race conditions", () => {
  it("D-CONC.01: duplicate blocked date — second create throws, returns error", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.blockedDate.create)
      .mockResolvedValueOnce({ id: "bd1", doctorId: "doc1", date: new Date("2024-01-01"), reason: null } as any)
      .mockRejectedValueOnce(new Error("Unique constraint failed"));

    const r1 = await addBlockedDate({ doctorId: "doc1", date: "2024-01-01" });
    const r2 = await addBlockedDate({ doctorId: "doc1", date: "2024-01-01" });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toContain("already blocked");
  });
});
