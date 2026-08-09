import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/actions/consultations", () => ({
  saveConsultation: vi.fn(),
  completeConsultation: vi.fn(),
  getActiveMedicines: vi.fn(),
  getActiveTestTypes: vi.fn(),
  savePrescription: vi.fn(),
  orderLabTest: vi.fn(),
}));

import { ConsultationForm } from "@/components/doctor/consultation-form";
import { saveConsultation, completeConsultation } from "@/actions/consultations";

const mockSave = vi.mocked(saveConsultation);
const mockComplete = vi.mocked(completeConsultation);

beforeEach(() => {
  vi.clearAllMocks();
  mockSave.mockResolvedValue({ ok: true, consultation: { id: "c1" } } as any);
  mockComplete.mockResolvedValue({
    ok: true,
    appointment: { id: "a1" },
    consultation: { id: "c1" },
  } as any);
});

describe("ConsultationForm", () => {
  const defaultProps = {
    appointmentId: "a1",
    consultationId: "c1",
    patientId: "p1",
    completedAt: null,
    hasPrescription: false,
    onSaved: vi.fn(),
    onCompleted: vi.fn(),
    onOpenPrescription: vi.fn(),
    onOpenLabOrder: vi.fn(),
  };

  it("renders all clinical fields", () => {
    render(<ConsultationForm {...defaultProps} />);
    expect(screen.getByText("Symptoms")).toBeInTheDocument();
    expect(screen.getByText("Diagnosis")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Vitals")).toBeInTheDocument();
    expect(screen.getByText("Follow-up Date (optional)")).toBeInTheDocument();
  });

  it("renders vital inputs with units", () => {
    render(<ConsultationForm {...defaultProps} />);
    expect(screen.getByText("BP")).toBeInTheDocument();
    expect(screen.getByText("Heart Rate")).toBeInTheDocument();
    expect(screen.getByText("Temp")).toBeInTheDocument();
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("Height")).toBeInTheDocument();
  });

  it("shows Add Prescription and Order Lab Tests buttons", () => {
    render(<ConsultationForm {...defaultProps} />);
    expect(screen.getByText("Add Prescription")).toBeInTheDocument();
    expect(screen.getByText("Order Lab Tests")).toBeInTheDocument();
  });

  it("calls onOpenPrescription when Add Prescription clicked", () => {
    const onOpenPrescription = vi.fn();
    render(
      <ConsultationForm {...defaultProps} onOpenPrescription={onOpenPrescription} />,
    );
    fireEvent.click(screen.getByText("Add Prescription"));
    expect(onOpenPrescription).toHaveBeenCalled();
  });

  it("calls onOpenLabOrder when Order Lab Tests clicked", () => {
    const onOpenLabOrder = vi.fn();
    render(
      <ConsultationForm {...defaultProps} onOpenLabOrder={onOpenLabOrder} />,
    );
    fireEvent.click(screen.getByText("Order Lab Tests"));
    expect(onOpenLabOrder).toHaveBeenCalled();
  });

  it("calls saveConsultation when Save clicked", async () => {
    render(<ConsultationForm {...defaultProps} />);
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ appointmentId: "a1" }),
      );
    });
  });

  it("calls completeConsultation when Complete clicked", async () => {
    render(<ConsultationForm {...defaultProps} />);
    fireEvent.click(screen.getByText("Complete Consultation"));
    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith("a1");
    });
  });

  it("disables Complete button when already completed", () => {
    render(
      <ConsultationForm
        {...defaultProps}
        completedAt={new Date(Date.now() - 1 * 60 * 60 * 1000)}
      />,
    );
    expect(screen.getByText("Completed")).toBeDisabled();
  });

  it("shows edit window indicator when completed", () => {
    render(
      <ConsultationForm
        {...defaultProps}
        completedAt={new Date(Date.now() - 2 * 60 * 60 * 1000)}
      />,
    );
    expect(screen.getByText(/Edit window/)).toBeInTheDocument();
  });

  it("shows locked indicator past 24h", () => {
    render(
      <ConsultationForm
        {...defaultProps}
        completedAt={new Date(Date.now() - 30 * 60 * 60 * 1000)}
      />,
    );
    expect(screen.getByText(/Consultation locked/)).toBeInTheDocument();
  });

  it("disables all inputs when locked", () => {
    render(
      <ConsultationForm
        {...defaultProps}
        completedAt={new Date(Date.now() - 30 * 60 * 60 * 1000)}
      />,
    );
    expect(screen.getByText("Save")).toBeDisabled();
    expect(screen.getByText("Add Prescription")).toBeDisabled();
    expect(screen.getByText("Order Lab Tests")).toBeDisabled();
  });

  it("shows Edit Prescription when prescription exists", () => {
    render(
      <ConsultationForm {...defaultProps} hasPrescription={true} />,
    );
    expect(screen.getByText("Edit Prescription")).toBeInTheDocument();
  });

  it("shows error when save fails", async () => {
    mockSave.mockResolvedValue({ ok: false, error: "Locked" } as any);
    render(<ConsultationForm {...defaultProps} />);
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      expect(screen.getByText("Locked")).toBeInTheDocument();
    });
  });
});
