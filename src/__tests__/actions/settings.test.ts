import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    hospitalSetting: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn(async (pw: string) => `hashed-${pw}`),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { auth } from "@/auth";
import {
  getHospitalSetting,
  updateHospitalSetting,
  getUsers,
  createUser,
  deactivateUser,
  resetPassword,
} from "@/actions/settings";

const mockAuth = vi.mocked(auth) as unknown as {
  mockReset(): void;
  mockResolvedValue(value: any): void;
};

function adminSession(id = "adm1") {
  return {
    user: { id, role: "ADMIN" as const, name: "Admin" },
    expires: new Date().toISOString(),
  } as any;
}

function doctorSession() {
  return {
    user: { id: "doc1", role: "DOCTOR" as const, name: "Doc" },
    expires: new Date().toISOString(),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(null);
});

// ─── getHospitalSetting ───────────────────────────────────────────────────────

describe("getHospitalSetting", () => {
  beforeEach(() => {
    vi.mocked(prisma.hospitalSetting.findFirst).mockReset();
    vi.mocked(prisma.hospitalSetting.create).mockReset();
  });

  it("returns existing setting for admin", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.hospitalSetting.findFirst).mockResolvedValue({
      id: "hs1",
      name: "CarePoint",
      address: null,
      phone: null,
      email: null,
      logoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await getHospitalSetting();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.setting.name).toBe("CarePoint");
  });

  it("creates default setting if none exists", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.hospitalSetting.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.hospitalSetting.create).mockResolvedValue({
      id: "hs1",
      name: "CarePoint Hospital",
      address: null,
      phone: null,
      email: null,
      logoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await getHospitalSetting();
    expect(result.ok).toBe(true);
    expect(prisma.hospitalSetting.create).toHaveBeenCalled();
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    await expect(getHospitalSetting()).rejects.toThrow("Unauthorized");
  });
});

// ─── updateHospitalSetting ────────────────────────────────────────────────────

describe("updateHospitalSetting", () => {
  beforeEach(() => {
    vi.mocked(prisma.hospitalSetting.findFirst).mockReset();
    vi.mocked(prisma.hospitalSetting.update).mockReset();
  });

  it("updates existing setting", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.hospitalSetting.findFirst).mockResolvedValue({
      id: "hs1",
      name: "Old",
      address: null,
      phone: null,
      email: null,
      logoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.mocked(prisma.hospitalSetting.update).mockResolvedValue({
      id: "hs1",
      name: "New Name",
      address: "123 St",
      phone: "999",
      email: "a@b.c",
      logoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const result = await updateHospitalSetting({
      name: "New Name",
      address: "123 St",
      phone: "999",
      email: "info@carepoint.in",
    });
    expect(result.ok).toBe(true);
    expect(prisma.hospitalSetting.update).toHaveBeenCalled();
  });

  it("rejects invalid input", async () => {
    mockAuth.mockResolvedValue(adminSession());
    const result = await updateHospitalSetting({
      name: "",
      address: "",
      phone: "",
      email: "",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    await expect(
      updateHospitalSetting({ name: "X", address: "", phone: "", email: "" }),
    ).rejects.toThrow("Unauthorized");
  });
});

// ─── getUsers ─────────────────────────────────────────────────────────────────

describe("getUsers", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findMany).mockReset();
  });

  it("returns all users for admin", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "u1",
        name: "Admin",
        email: "admin@cp.in",
        role: "ADMIN",
        emailVerified: null,
        createdAt: new Date(),
      },
    ] as any);

    const result = await getUsers();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.users).toHaveLength(1);
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    await expect(getUsers()).rejects.toThrow("Unauthorized");
  });
});

// ─── createUser ───────────────────────────────────────────────────────────────

describe("createUser", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.create).mockReset();
  });

  it("creates a new user", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      name: "New Doc",
      email: "doc@cp.in",
      role: "DOCTOR",
    } as any);

    const result = await createUser({
      name: "New Doc",
      email: "doc@cp.in",
      password: "secret123",
      role: "DOCTOR",
    });
    expect(result.ok).toBe(true);
    expect(hashPassword).toHaveBeenCalledWith("secret123");
  });

  it("rejects duplicate email", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "existing",
    } as any);

    const result = await createUser({
      name: "Dup",
      email: "existing@cp.in",
      password: "secret123",
      role: "RECEPTIONIST",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("already exists");
  });

  it("rejects short password", async () => {
    mockAuth.mockResolvedValue(adminSession());
    const result = await createUser({
      name: "X",
      email: "x@cp.in",
      password: "123",
      role: "ADMIN",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    await expect(
      createUser({
        name: "X",
        email: "x@cp.in",
        password: "secret123",
        role: "ADMIN",
      }),
    ).rejects.toThrow("Unauthorized");
  });
});

// ─── deactivateUser ───────────────────────────────────────────────────────────

describe("deactivateUser", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.delete).mockReset();
  });

  it("deletes a user", async () => {
    mockAuth.mockResolvedValue(adminSession("adm1"));
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u2" } as any);
    vi.mocked(prisma.user.delete).mockResolvedValue({ id: "u2" } as any);

    const result = await deactivateUser("u2");
    expect(result.ok).toBe(true);
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "u2" } });
  });

  it("cannot deactivate self", async () => {
    mockAuth.mockResolvedValue(adminSession("adm1"));
    const result = await deactivateUser("adm1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("own account");
  });

  it("rejects if user not found", async () => {
    mockAuth.mockResolvedValue(adminSession("adm1"));
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await deactivateUser("nonexistent");
    expect(result.ok).toBe(false);
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    await expect(deactivateUser("u2")).rejects.toThrow("Unauthorized");
  });
});

// ─── resetPassword ────────────────────────────────────────────────────────────

describe("resetPassword", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.update).mockReset();
  });

  it("resets password for a user", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1" } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "u1" } as any);

    const result = await resetPassword("u1", "newpass123");
    expect(result.ok).toBe(true);
    expect(hashPassword).toHaveBeenCalledWith("newpass123");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { password: "hashed-newpass123" },
    });
  });

  it("rejects short password", async () => {
    mockAuth.mockResolvedValue(adminSession());
    const result = await resetPassword("u1", "123");
    expect(result.ok).toBe(false);
  });

  it("rejects if user not found", async () => {
    mockAuth.mockResolvedValue(adminSession());
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await resetPassword("nonexistent", "newpass123");
    expect(result.ok).toBe(false);
  });

  it("rejects non-admin", async () => {
    mockAuth.mockResolvedValue(doctorSession());
    await expect(resetPassword("u1", "newpass123")).rejects.toThrow(
      "Unauthorized",
    );
  });
});
