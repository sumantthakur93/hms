import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock prisma — server components query Prisma directly
vi.mock("@/lib/prisma", () => ({
  prisma: {
    department: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { DepartmentList } from "@/components/department-list";

describe("DepartmentList (server component)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a list of departments with names and fees", async () => {
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

    const ui = await DepartmentList();
    render(ui);

    expect(screen.getByTestId("department-list")).toBeInTheDocument();
    expect(screen.getByTestId("dept-d1-name")).toHaveTextContent("Cardiology");
    expect(screen.getByTestId("dept-d1-fee")).toHaveTextContent("₹1000");
    expect(screen.getByTestId("dept-d2-name")).toHaveTextContent(
      "General Medicine",
    );
    expect(screen.getByTestId("dept-d2-fee")).toHaveTextContent("₹500");
  });

  it("renders an empty list when no departments exist", async () => {
    vi.mocked(prisma.department.findMany).mockResolvedValue([]);

    const ui = await DepartmentList();
    render(ui);

    expect(screen.getByTestId("department-list")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/dept-/)).toHaveLength(0);
  });
});
