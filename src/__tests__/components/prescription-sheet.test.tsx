import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/actions/consultations", () => ({
  savePrescription: vi.fn(),
  getActiveMedicines: vi.fn(),
  getActiveTestTypes: vi.fn(),
  orderLabTest: vi.fn(),
}));

import { PrescriptionSheet } from "@/components/doctor/prescription-sheet";
import { savePrescription, getActiveMedicines } from "@/actions/consultations";

const mockSave = vi.mocked(savePrescription);
const mockGetMedicines = vi.mocked(getActiveMedicines);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetMedicines.mockResolvedValue({
    ok: true,
    medicines: [
      { id: "m1", name: "Paracetamol 500mg", genericName: "Paracetamol", category: "Analgesic" },
      { id: "m2", name: "Amoxicillin 500mg", genericName: "Amoxicillin", category: "Antibiotic" },
    ],
  } as any);
  mockSave.mockResolvedValue({ ok: true, prescription: { id: "rx1" } } as any);
});

describe("PrescriptionSheet", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    consultationId: "c1",
    onSaved: vi.fn(),
  };

  it("renders title and description when open", async () => {
    render(<PrescriptionSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Prescription")).toBeInTheDocument();
    });
    expect(screen.getByText("Add medicines to prescribe to the patient.")).toBeInTheDocument();
  });

  it("loads medicines on open", async () => {
    render(<PrescriptionSheet {...defaultProps} />);
    await waitFor(() => {
      expect(mockGetMedicines).toHaveBeenCalled();
    });
  });

  it("shows Add Item button when not locked", async () => {
    render(<PrescriptionSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Add Item")).toBeInTheDocument();
    });
  });

  it("hides Add Item button when locked", async () => {
    render(<PrescriptionSheet {...defaultProps} locked={true} />);
    await waitFor(() => {
      expect(screen.queryByText("Add Item")).not.toBeInTheDocument();
    });
  });

  it("shows locked message when locked", async () => {
    render(<PrescriptionSheet {...defaultProps} locked={true} />);
    await waitFor(() => {
      expect(screen.getByText(/Prescription is locked/)).toBeInTheDocument();
    });
  });

  it("disables Save button when locked", async () => {
    render(<PrescriptionSheet {...defaultProps} locked={true} />);
    await waitFor(() => {
      expect(screen.getByText("Save Prescription")).toBeDisabled();
    });
  });

  it("loads existing items when provided", async () => {
    render(
      <PrescriptionSheet
        {...defaultProps}
        existingItems={[
          {
            id: "pi1",
            medicineId: "m1",
            dosage: "1 tablet",
            frequency: "OD",
            duration: "7 days",
            instructions: "After meals",
            quantity: 7,
            medicine: { name: "Paracetamol 500mg" },
          },
        ]}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Item 1")).toBeInTheDocument();
    });
  });

  it("shows error when saving with no items", async () => {
    render(<PrescriptionSheet {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Save Prescription")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Save Prescription"));
    await waitFor(() => {
      expect(screen.getByText("Add at least one medicine")).toBeInTheDocument();
    });
  });
});
