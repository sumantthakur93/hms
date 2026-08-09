import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    doctorProfile: {
      findMany: vi.fn(),
    },
    scheduleBlock: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    blockedDate: {
      create: vi.fn(),
      delete: vi.fn(),
    },
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
    user: { id: "admin-id", role: "ADMIN", name: "Admin", email: "admin@carepoint.in" },
    expires: new Date().toISOString(),
  } as any;
}

function receptionistSession() {
  return {
    user: { id: "rec-id", role: "RECEPTIONIST", name: "Rec", email: "rec@carepoint.in" },
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

describe("Authorization (all actions)", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("rejects unauthenticated for getDoctors", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getDoctors()).rejects.toThrow("Unauthorized");
  });

  it("rejects non-admin for getDoctors", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    await expect(getDoctors()).rejects.toThrow("Unauthorized");
  });

  it("rejects non-admin for createScheduleBlock", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    await expect(createScheduleBlock(validInput as any)).rejects.toThrow("Unauthorized");
  });

  it("rejects non-admin for deleteScheduleBlock", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    await expect(deleteScheduleBlock("b1")).rejects.toThrow("Unauthorized");
  });

  it("rejects non-admin for addBlockedDate", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    await expect(addBlockedDate({ doctorId: "d1", date: "2024-01-01" } as any)).rejects.toThrow("Unauthorized");
  });

  it("rejects non-admin for removeBlockedDate", async () => {
    mockAuth.mockResolvedValue(receptionistSession());
    await expect(removeBlockedDate("bd1")).rejects.toThrow("Unauthorized");
  });
});

describe("getDoctors", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.doctorProfile.findMany).mockReset();
  });

  it("returns doctors with schedule summary", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.doctorProfile.findMany).mockResolvedValue([
      {
        id: "doc1",
        specialization: "Cardiology",
        user: { name: "Dr. Rajesh Mehta" },
        department: { name: "Cardiology" },
        scheduleBlocks: [
          { id: "b1", dayOfWeek: 1, startTime: "09:00", endTime: "13:00", slotDuration: 30 },
        ],
        blockedDates: [],
      },
    ] as any);

    const result = await getDoctors();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Dr. Rajesh Mehta");
    expect(result[0].scheduleBlocks).toHaveLength(1);
  });
});

describe("createScheduleBlock", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.scheduleBlock.create).mockReset();
  });

  it("creates a valid schedule block", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.scheduleBlock.create).mockResolvedValue({
      id: "b1", ...validInput,
    } as any);

    const result = await createScheduleBlock(validInput);

    expect(result.ok).toBe(true);
    expect(vi.mocked(prisma.scheduleBlock.create)).toHaveBeenCalledTimes(1);
  });

  it("rejects start time after end time", async () => {
    mockAuth.mockResolvedValue(adminSession());
    const result = await createScheduleBlock({
      ...validInput,
      startTime: "14:00",
      endTime: "09:00",
    });

    expect(result.ok).toBe(false);
  });

  it("rejects invalid day of week", async () => {
    mockAuth.mockResolvedValue(adminSession());
    const result = await createScheduleBlock({
      ...validInput,
      dayOfWeek: 7,
    } as any);

    expect(result.ok).toBe(false);
  });

  it("rejects invalid time format", async () => {
    mockAuth.mockResolvedValue(adminSession());
    const result = await createScheduleBlock({
      ...validInput,
      startTime: "9:00",
    } as any);

    expect(result.ok).toBe(false);
  });

  it("rejects slot duration out of range", async () => {
    mockAuth.mockResolvedValue(adminSession());
    const result = await createScheduleBlock({
      ...validInput,
      slotDuration: 200,
    } as any);

    expect(result.ok).toBe(false);
  });
});

describe("updateScheduleBlock", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.scheduleBlock.update).mockReset();
  });

  it("updates a schedule block", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.scheduleBlock.update).mockResolvedValue({
      id: "b1", ...validInput, slotDuration: 15,
    } as any);

    const result = await updateScheduleBlock("b1", { ...validInput, slotDuration: 15 });

    expect(result.ok).toBe(true);
    const call = vi.mocked(prisma.scheduleBlock.update).mock.calls[0][0];
    expect(call.where.id).toBe("b1");
    expect(call.data.slotDuration).toBe(15);
  });

  it("rejects invalid input", async () => {
    mockAuth.mockResolvedValue(adminSession());
    const result = await updateScheduleBlock("b1", {
      ...validInput,
      endTime: "08:00",
    });

    expect(result.ok).toBe(false);
  });
});

describe("deleteScheduleBlock", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.scheduleBlock.delete).mockReset();
  });

  it("deletes a schedule block", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.scheduleBlock.delete).mockResolvedValue({ id: "b1" } as any);

    const result = await deleteScheduleBlock("b1");

    expect(result.ok).toBe(true);
    expect(vi.mocked(prisma.scheduleBlock.delete)).toHaveBeenCalledWith({ where: { id: "b1" } });
  });
});

describe("addBlockedDate", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.blockedDate.create).mockReset();
  });

  it("adds a blocked date with reason", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.blockedDate.create).mockResolvedValue({
      id: "bd1", doctorId: "doc1", date: new Date("2024-01-01"), reason: "Leave",
    } as any);

    const result = await addBlockedDate({
      doctorId: "doc1",
      date: "2024-01-01",
      reason: "Leave",
    });

    expect(result.ok).toBe(true);
    const call = vi.mocked(prisma.blockedDate.create).mock.calls[0][0];
    expect(call.data.reason).toBe("Leave");
  });

  it("adds a blocked date without reason", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.blockedDate.create).mockResolvedValue({
      id: "bd2", doctorId: "doc1", date: new Date("2024-01-02"), reason: null,
    } as any);

    const result = await addBlockedDate({
      doctorId: "doc1",
      date: "2024-01-02",
    });

    expect(result.ok).toBe(true);
    const call = vi.mocked(prisma.blockedDate.create).mock.calls[0][0];
    expect(call.data.reason).toBeNull();
  });

  it("returns error for duplicate blocked date", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.blockedDate.create).mockRejectedValue(new Error("Unique constraint"));

    const result = await addBlockedDate({
      doctorId: "doc1",
      date: "2024-01-01",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("already blocked");
    }
  });
});

describe("removeBlockedDate", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    vi.mocked(prisma.blockedDate.delete).mockReset();
  });

  it("removes a blocked date", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.blockedDate.delete).mockResolvedValue({ id: "bd1" } as any);

    const result = await removeBlockedDate("bd1");

    expect(result.ok).toBe(true);
    expect(vi.mocked(prisma.blockedDate.delete)).toHaveBeenCalledWith({ where: { id: "bd1" } });
  });
});
