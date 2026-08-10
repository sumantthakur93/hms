import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAuthSession } from "../helpers/mock-auth";

// Mock prisma — tests verify the action calls the right Prisma method
// and returns the right shape, without needing a live database
vi.mock("@/lib/prisma", () => ({
  prisma: {
    department: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    doctorProfile: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/actions/departments";

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
      include: { _count: { select: { doctors: true } } },
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

// ─── CRUD: createDepartment ───────────────────────────────────────────────────

describe("createDepartment (server action)", () => {
  beforeEach(() => {
    vi.mocked(prisma.department.create).mockReset();
    vi.mocked(prisma.department.findUnique).mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    setAuthSession(null);
    const result = await createDepartment({
      name: "Cardiology",
      consultationFee: 500,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects non-admin users", async () => {
    setAuthSession("DOCTOR");
    const result = await createDepartment({
      name: "Cardiology",
      consultationFee: 500,
    });
    expect(result.ok).toBe(false);
  });

  it("creates a department with valid input", async () => {
    const mockDept = {
      id: "d1",
      name: "Cardiology",
      description: "Heart stuff",
      consultationFee: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.department.create).mockResolvedValue(mockDept);

    setAuthSession("ADMIN");
    const result = await createDepartment({
      name: "Cardiology",
      description: "Heart stuff",
      consultationFee: 500,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.department.name).toBe("Cardiology");
    }
    expect(vi.mocked(prisma.department.create)).toHaveBeenCalledTimes(1);
  });

  it("rejects empty name", async () => {
    setAuthSession("ADMIN");
    const result = await createDepartment({
      name: "",
      consultationFee: 500,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects negative consultation fee", async () => {
    setAuthSession("ADMIN");
    const result = await createDepartment({
      name: "Cardiology",
      consultationFee: -100,
    });
    expect(result.ok).toBe(false);
  });

  it("returns error on duplicate name (unique constraint)", async () => {
    vi.mocked(prisma.department.create).mockRejectedValue(
      new Error("Unique constraint failed"),
    );

    setAuthSession("ADMIN");
    const result = await createDepartment({
      name: "Cardiology",
      consultationFee: 500,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/already exists/i);
    }
  });
});

// ─── CRUD: updateDepartment ───────────────────────────────────────────────────

describe("updateDepartment (server action)", () => {
  beforeEach(() => {
    vi.mocked(prisma.department.findUnique).mockReset();
    vi.mocked(prisma.department.update).mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    setAuthSession(null);
    const result = await updateDepartment("d1", {
      name: "Cardiology",
      consultationFee: 600,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects non-admin users", async () => {
    setAuthSession("RECEPTIONIST");
    const result = await updateDepartment("d1", {
      name: "Cardiology",
      consultationFee: 600,
    });
    expect(result.ok).toBe(false);
  });

  it("updates a department with valid input", async () => {
    vi.mocked(prisma.department.findUnique).mockResolvedValue({
      id: "d1",
      name: "Cardiology",
      description: null,
      consultationFee: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.department.update).mockResolvedValue({
      id: "d1",
      name: "Cardiology Updated",
      description: "Heart stuff",
      consultationFee: 600,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setAuthSession("ADMIN");
    const result = await updateDepartment("d1", {
      name: "Cardiology Updated",
      description: "Heart stuff",
      consultationFee: 600,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.department.name).toBe("Cardiology Updated");
      expect(result.department.consultationFee).toBe(600);
    }
  });

  it("returns error when department not found", async () => {
    vi.mocked(prisma.department.findUnique).mockResolvedValue(null);

    setAuthSession("ADMIN");
    const result = await updateDepartment("nonexistent", {
      name: "Cardiology",
      consultationFee: 600,
    });

    expect(result.ok).toBe(false);
  });

  it("rejects empty name", async () => {
    setAuthSession("ADMIN");
    const result = await updateDepartment("d1", {
      name: "",
      consultationFee: 600,
    });
    expect(result.ok).toBe(false);
  });
});

// ─── CRUD: deleteDepartment ───────────────────────────────────────────────────

describe("deleteDepartment (server action)", () => {
  beforeEach(() => {
    vi.mocked(prisma.department.findUnique).mockReset();
    vi.mocked(prisma.department.delete).mockReset();
    vi.mocked(prisma.doctorProfile.count).mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    setAuthSession(null);
    const result = await deleteDepartment("d1");
    expect(result.ok).toBe(false);
  });

  it("rejects non-admin users", async () => {
    setAuthSession("PATIENT");
    const result = await deleteDepartment("d1");
    expect(result.ok).toBe(false);
  });

  it("deletes a department with no assigned doctors", async () => {
    vi.mocked(prisma.department.findUnique).mockResolvedValue({
      id: "d1",
      name: "Old Dept",
      description: null,
      consultationFee: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.doctorProfile.count).mockResolvedValue(0);
    vi.mocked(prisma.department.delete).mockResolvedValue({
      id: "d1",
      name: "Old Dept",
      description: null,
      consultationFee: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setAuthSession("ADMIN");
    const result = await deleteDepartment("d1");

    expect(result.ok).toBe(true);
    expect(vi.mocked(prisma.department.delete)).toHaveBeenCalledWith({
      where: { id: "d1" },
    });
  });

  it("prevents deletion when doctors are assigned", async () => {
    vi.mocked(prisma.department.findUnique).mockResolvedValue({
      id: "d1",
      name: "Cardiology",
      description: null,
      consultationFee: 500,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.doctorProfile.count).mockResolvedValue(3);

    setAuthSession("ADMIN");
    const result = await deleteDepartment("d1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/doctor/i);
    }
    expect(vi.mocked(prisma.department.delete)).not.toHaveBeenCalled();
  });

  it("returns error when department not found", async () => {
    vi.mocked(prisma.department.findUnique).mockResolvedValue(null);

    setAuthSession("ADMIN");
    const result = await deleteDepartment("nonexistent");

    expect(result.ok).toBe(false);
  });
});
