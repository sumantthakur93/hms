import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAuthSession } from "../helpers/mock-auth";

// Mock prisma — tests verify the action calls the right Prisma method
// and returns the right shape, without needing a live database
vi.mock("@/lib/prisma", () => ({
  prisma: {
    department: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getDepartments, getDepartment } from "@/actions/departments";

describe("getDepartments (server action)", () => {
  beforeEach(() => {
    vi.mocked(prisma.department.findMany).mockReset();
    vi.mocked(prisma.department.findUnique).mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    setAuthSession(null);
    const result = await getDepartments();
    expect(result.ok).toBe(false);
  });

  it("returns departments for an authenticated patient", async () => {
    const mockDepts = [
      {
        id: "d1",
        name: "Cardiology",
        description: null,
        consultationFee: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "d2",
        name: "General Medicine",
        description: null,
        consultationFee: 500,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    vi.mocked(prisma.department.findMany).mockResolvedValue(mockDepts);

    setAuthSession("PATIENT");
    const result = await getDepartments();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.departments).toEqual(mockDepts);
      expect(result.departments).toHaveLength(2);
    }
    expect(prisma.department.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
    });
  });

  it("returns departments for an admin", async () => {
    vi.mocked(prisma.department.findMany).mockResolvedValue([]);

    setAuthSession("ADMIN");
    const result = await getDepartments();

    expect(result.ok).toBe(true);
  });
});

describe("getDepartment (server action)", () => {
  beforeEach(() => {
    vi.mocked(prisma.department.findMany).mockReset();
    vi.mocked(prisma.department.findUnique).mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    setAuthSession(null);
    const result = await getDepartment("d1");
    expect(result.ok).toBe(false);
  });

  it("returns a department when found", async () => {
    const mockDept = {
      id: "d1",
      name: "Cardiology",
      description: null,
      consultationFee: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.department.findUnique).mockResolvedValue(mockDept);

    setAuthSession("DOCTOR");
    const result = await getDepartment("d1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.department.name).toBe("Cardiology");
    }
  });

  it("returns error when department not found", async () => {
    vi.mocked(prisma.department.findUnique).mockResolvedValue(null);

    setAuthSession("DOCTOR");
    const result = await getDepartment("nonexistent");

    expect(result.ok).toBe(false);
  });
});
