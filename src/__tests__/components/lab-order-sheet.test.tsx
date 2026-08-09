import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/actions/consultations", () => ({
  orderLabTest: vi.fn(),
  getActiveTestTypes: vi.fn(),
  getActiveMedicines: vi.fn(),
  savePrescription: vi.fn(),
}));

import { LabOrderSheet } from "@/components/doctor/lab-order-sheet";
import { getActiveTestTypes } from "@/actions/consultations";

const mockGetTestTypes = vi.mocked(getActiveTestTypes);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetTestTypes.mockResolvedValue({
    ok: true,
    testTypes: [
      { id: "tt1", name: "Complete Blood Count", code: "CBC", category: "Hematology", price: 350 },
      { id: "tt2", name: "Lipid Panel", code: "LIPID", category: "Biochemistry", price: 600 },
    ],
  } as any);
});

describe("LabOrderSheet", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    consultationId: "c1",
    patientId: "p1",
    onOrdered: vi.fn(),
  };

  it("renders title when open", async () => {
    render(<LabOrderSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Order Lab Tests")).toBeInTheDocument();
    });
  });

  it("renders description", async () => {
    render(<LabOrderSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Select tests to order for this patient.")).toBeInTheDocument();
    });
  });

  it("loads test types on open", async () => {
    render(<LabOrderSheet {...defaultProps} />);
    await waitFor(() => {
      expect(mockGetTestTypes).toHaveBeenCalled();
    });
  });

  it("shows Add Test button", async () => {
    render(<LabOrderSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Add Test")).toBeInTheDocument();
    });
  });

  it("shows Order Tests button", async () => {
    render(<LabOrderSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Order Tests")).toBeInTheDocument();
    });
  });

  it("shows Test 1 label for initial order row", async () => {
    render(<LabOrderSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Test 1")).toBeInTheDocument();
    });
  });

  it("renders Priority label", async () => {
    render(<LabOrderSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Priority")).toBeInTheDocument();
    });
  });

  it("renders Instructions label", async () => {
    render(<LabOrderSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Instructions (optional)")).toBeInTheDocument();
    });
  });
});
