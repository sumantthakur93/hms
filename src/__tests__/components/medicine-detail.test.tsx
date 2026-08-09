import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/actions/pharmacy", () => ({
  getMedicine: vi.fn(),
  addBatch: vi.fn(),
  adjustStock: vi.fn(),
  deactivateMedicine: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { MedicineDetail } from "@/components/pharmacy/medicine-detail";
import { getMedicine } from "@/actions/pharmacy";

const mockGetMedicine = vi.mocked(getMedicine);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MedicineDetail", () => {
  it("renders medicine name and generic name", async () => {
    mockGetMedicine.mockResolvedValue({
      ok: true,
      medicine: {
        id: "m1",
        name: "Paracetamol 500mg",
        genericName: "Paracetamol",
        manufacturer: "Cipla",
        category: "Analgesic",
        unitPrice: 2.5,
        reorderLevel: 100,
        active: true,
        batches: [],
        totalStock: 0,
        totalValue: 0,
        stockStatus: "OUT_OF_STOCK",
      },
    } as any);
    render(<MedicineDetail medicineId="m1" />);
    await waitFor(() => {
      expect(screen.getByText("Paracetamol 500mg")).toBeInTheDocument();
    });
  });

  it("renders stats row", async () => {
    mockGetMedicine.mockResolvedValue({
      ok: true,
      medicine: {
        id: "m1",
        name: "Paracetamol",
        genericName: "Paracetamol",
        manufacturer: null,
        category: null,
        unitPrice: 2.5,
        reorderLevel: 100,
        active: true,
        batches: [],
        totalStock: 200,
        totalValue: 500,
        stockStatus: "IN_STOCK",
      },
    } as any);
    render(<MedicineDetail medicineId="m1" />);
    await waitFor(() => {
      expect(screen.getByText("Total Stock")).toBeInTheDocument();
      expect(screen.getByText("Total Value")).toBeInTheDocument();
      expect(screen.getByText("Batches")).toBeInTheDocument();
      expect(screen.getByText("Reorder Level")).toBeInTheDocument();
    });
  });

  it("renders batches table with FEFO order", async () => {
    mockGetMedicine.mockResolvedValue({
      ok: true,
      medicine: {
        id: "m1",
        name: "Paracetamol",
        genericName: "Paracetamol",
        manufacturer: null,
        category: null,
        unitPrice: 2.5,
        reorderLevel: 100,
        active: true,
        batches: [
          {
            id: "b1",
            batchNumber: "B-001",
            expiryDate: new Date("2025-06-01"),
            quantity: 100,
            status: "FRESH",
            fefoOrder: 1,
          },
        ],
        totalStock: 100,
        totalValue: 250,
        stockStatus: "IN_STOCK",
      },
    } as any);
    render(<MedicineDetail medicineId="m1" />);
    await waitFor(() => {
      expect(screen.getByText("B-001")).toBeInTheDocument();
      expect(screen.getByText("#1")).toBeInTheDocument();
    });
  });

  it("shows Add Batch button", async () => {
    mockGetMedicine.mockResolvedValue({
      ok: true,
      medicine: {
        id: "m1",
        name: "Paracetamol",
        genericName: "Paracetamol",
        manufacturer: null,
        category: null,
        unitPrice: 2.5,
        reorderLevel: 100,
        active: true,
        batches: [],
        totalStock: 0,
        totalValue: 0,
        stockStatus: "OUT_OF_STOCK",
      },
    } as any);
    render(<MedicineDetail medicineId="m1" />);
    await waitFor(() => {
      expect(screen.getByText("Add Batch")).toBeInTheDocument();
    });
  });

  it("shows Edit and Deactivate buttons for active medicine", async () => {
    mockGetMedicine.mockResolvedValue({
      ok: true,
      medicine: {
        id: "m1",
        name: "Paracetamol",
        genericName: "Paracetamol",
        manufacturer: null,
        category: null,
        unitPrice: 2.5,
        reorderLevel: 100,
        active: true,
        batches: [],
        totalStock: 0,
        totalValue: 0,
        stockStatus: "OUT_OF_STOCK",
      },
    } as any);
    render(<MedicineDetail medicineId="m1" />);
    await waitFor(() => {
      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Deactivate")).toBeInTheDocument();
    });
  });

  it("shows error when medicine not found", async () => {
    mockGetMedicine.mockResolvedValue({
      ok: false,
      error: "Medicine not found",
    } as any);
    render(<MedicineDetail medicineId="nonexistent" />);
    await waitFor(() => {
      expect(screen.getByText("Medicine not found")).toBeInTheDocument();
    });
  });

  it("shows empty batches message when no batches", async () => {
    mockGetMedicine.mockResolvedValue({
      ok: true,
      medicine: {
        id: "m1",
        name: "Paracetamol",
        genericName: "Paracetamol",
        manufacturer: null,
        category: null,
        unitPrice: 2.5,
        reorderLevel: 100,
        active: true,
        batches: [],
        totalStock: 0,
        totalValue: 0,
        stockStatus: "OUT_OF_STOCK",
      },
    } as any);
    render(<MedicineDetail medicineId="m1" />);
    await waitFor(() => {
      expect(screen.getByText(/No batches yet/)).toBeInTheDocument();
    });
  });
});
