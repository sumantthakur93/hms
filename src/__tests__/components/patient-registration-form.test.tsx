import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock server actions
vi.mock("@/actions/patients", () => ({
  createPatient: vi.fn(),
}));

vi.mock("@/actions/auth", () => ({
  checkDuplicatePhone: vi.fn(),
}));

import { PatientRegistrationForm } from "@/components/receptionist/patient-registration-form";
import { createPatient } from "@/actions/patients";
import { checkDuplicatePhone } from "@/actions/auth";

const mockCreate = vi.mocked(createPatient);
const mockCheckDup = vi.mocked(checkDuplicatePhone);

describe("PatientRegistrationForm", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCheckDup.mockReset();
    mockCheckDup.mockResolvedValue({ duplicate: false, existingPatient: null });
  });

  it("renders required fields", () => {
    render(<PatientRegistrationForm />);
    expect(screen.getByPlaceholderText("Rahul")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Kumar")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("+91 98765 43210")).toBeInTheDocument();
    expect(screen.getByText("Register Patient")).toBeInTheDocument();
  });

  it("does not show optional fields by default", () => {
    render(<PatientRegistrationForm />);
    expect(screen.queryByText("More about the patient")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("rahul@example.com"),
    ).not.toBeInTheDocument();
  });

  it("shows optional fields when toggled", () => {
    render(<PatientRegistrationForm />);
    const toggle = screen.getByText("More about the patient");
    fireEvent.click(toggle);
    expect(
      screen.getByPlaceholderText("rahul@example.com"),
    ).toBeInTheDocument();
  });

  it("submits and shows success with MRN", async () => {
    mockCreate.mockResolvedValue({
      ok: true,
      patient: {
        id: "p1",
        mrn: "MRN-00001",
        firstName: "Rahul",
        lastName: "Kumar",
      },
    });

    render(<PatientRegistrationForm />);

    fireEvent.change(screen.getByPlaceholderText("Rahul"), {
      target: { value: "Rahul" },
    });
    fireEvent.change(screen.getByPlaceholderText("Kumar"), {
      target: { value: "Kumar" },
    });
    fireEvent.change(screen.getByPlaceholderText("+91 98765 43210"), {
      target: { value: "+91 98765 43210" },
    });
    fireEvent.click(screen.getByText("Register Patient"));

    await waitFor(() => {
      expect(screen.getByText("Patient Registered")).toBeInTheDocument();
      expect(screen.getByText("MRN-00001")).toBeInTheDocument();
    });
  });

  it("shows duplicate phone warning", async () => {
    mockCheckDup.mockResolvedValue({
      duplicate: true,
      existingPatient: { id: "p1", firstName: "Rahul", lastName: "Kumar" },
    });

    render(<PatientRegistrationForm />);

    fireEvent.change(screen.getByPlaceholderText("Rahul"), {
      target: { value: "Rahul" },
    });
    fireEvent.change(screen.getByPlaceholderText("Kumar"), {
      target: { value: "Kumar" },
    });
    fireEvent.change(screen.getByPlaceholderText("+91 98765 43210"), {
      target: { value: "+91 98765 43210" },
    });
    fireEvent.click(screen.getByText("Register Patient"));

    await waitFor(() => {
      expect(screen.getByText("Duplicate phone number")).toBeInTheDocument();
      expect(screen.getByText("Continue anyway")).toBeInTheDocument();
    });
  });

  it("shows error when server action fails", async () => {
    mockCreate.mockResolvedValue({
      ok: false,
      error: "Phone number is already in use",
    });

    render(<PatientRegistrationForm />);

    fireEvent.change(screen.getByPlaceholderText("Rahul"), {
      target: { value: "Rahul" },
    });
    fireEvent.change(screen.getByPlaceholderText("Kumar"), {
      target: { value: "Kumar" },
    });
    fireEvent.change(screen.getByPlaceholderText("+91 98765 43210"), {
      target: { value: "+91 98765 43210" },
    });
    fireEvent.click(screen.getByText("Register Patient"));

    await waitFor(() => {
      expect(
        screen.getByText("Phone number is already in use"),
      ).toBeInTheDocument();
    });
  });

  it("offers Register Another after success", async () => {
    mockCreate.mockResolvedValue({
      ok: true,
      patient: {
        id: "p1",
        mrn: "MRN-00001",
        firstName: "Rahul",
        lastName: "Kumar",
      },
    });

    render(<PatientRegistrationForm />);

    fireEvent.change(screen.getByPlaceholderText("Rahul"), {
      target: { value: "Rahul" },
    });
    fireEvent.change(screen.getByPlaceholderText("Kumar"), {
      target: { value: "Kumar" },
    });
    fireEvent.change(screen.getByPlaceholderText("+91 98765 43210"), {
      target: { value: "+91 98765 43210" },
    });
    fireEvent.click(screen.getByText("Register Patient"));

    await waitFor(() => {
      expect(screen.getByText("Register Another")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Register Another"));

    // Form should be back to initial state
    expect(screen.getByText("Register Patient")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Rahul")).toHaveValue("");
  });
});
