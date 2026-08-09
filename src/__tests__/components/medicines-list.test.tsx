import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/actions/pharmacy", () => ({
  getMedicines: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { MedicinesList } from "@/components/pharmacy/medicines-list";
import { getMedicines } from "@/actions/pharmacy";

const mockGetMedicines = vi.mocked(getMedicines);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetMedicines.mockResolvedValue({ ok: true, medicines: [] } as any);
});

describe("MedicinesList", () => {
  it("renders title and Add Medicine button", async () => {
    render(<MedicinesList />);
    await waitFor(() => {
      expect(screen.getByText("Pharmacy Inventory")).toBeInTheDocument();
    });
    expect(screen.getByText("Add Medicine")).toBeInTheDocument();
  });

  it("shows empty state when no medicines", async () => {
    render(<MedicinesList />);
    await waitFor(() => {
      expect(screen.getByText("No medicines found")).toBeInTheDocument();
    });
  });

  it("renders medicine with name and stock", async () => {
    mockGetMedicines.mockResolvedValue({
      ok: true,
      medicines: [
        {
          id: "m1",
          name: "Paracetamol 500mg",
          genericName: "Paracetamol",
          manufacturer: "Cipla",
          category: "Analgesic",
          unitPrice: 2.5,
          reorderLevel: 100,
          active: true,
          totalStock: 200,
          stockStatus: "IN_STOCK",
          batchCount: 1,
        },
      ],
    } as any);
    render(<MedicinesList />);
    await waitFor(() => {
      expect(screen.getByText("Paracetamol 500mg")).toBeInTheDocument();
    });
  });

  it("shows low stock alert banner", async () => {
    mockGetMedicines.mockResolvedValue({
      ok: true,
      medicines: [
        {
          id: "m1",
          name: "Amoxicillin",
          genericName: "Amoxicillin",
          manufacturer: null,
          category: null,
          unitPrice: 5,
          reorderLevel: 50,
          active: true,
          totalStock: 10,
          stockStatus: "LOW_STOCK",
          batchCount: 1,
        },
      ],
    } as any);
    render(<MedicinesList />);
    await waitFor(() => {
      expect(screen.getByText(/below reorder level/)).toBeInTheDocument();
    });
  });

  it("shows In Stock badge for in-stock medicine", async () => {
    mockGetMedicines.mockResolvedValue({
      ok: true,
      medicines: [
        {
          id: "m1",
          name: "Paracetamol",
          genericName: "Paracetamol",
          manufacturer: null,
          category: null,
          unitPrice: 2.5,
          reorderLevel: 100,
          active: true,
          totalStock: 200,
          stockStatus: "IN_STOCK",
          batchCount: 1,
        },
      ],
    } as any);
    render(<MedicinesList />);
    await waitFor(() => {
      expect(screen.getByText("In Stock")).toBeInTheDocument();
    });
  });

  it("shows Out of Stock badge for zero stock", async () => {
    mockGetMedicines.mockResolvedValue({
      ok: true,
      medicines: [
        {
          id: "m1",
          name: "Paracetamol",
          genericName: "Paracetamol",
          manufacturer: null,
          category: null,
          unitPrice: 2.5,
          reorderLevel: 100,
          active: true,
          totalStock: 0,
          stockStatus: "OUT_OF_STOCK",
          batchCount: 0,
        },
      ],
    } as any);
    render(<MedicinesList />);
    await waitFor(() => {
      expect(screen.getByText("Out of Stock")).toBeInTheDocument();
    });
  });
});
