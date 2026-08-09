import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/actions/appointments", () => ({
  walkInRegistration: vi.fn(),
}));

import { WalkInForm } from "@/components/receptionist/walk-in-form";
import { walkInRegistration } from "@/actions/appointments";

const mockWalkIn = vi.mocked(walkInRegistration);

describe("WalkInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWalkIn.mockResolvedValue({
      ok: true,
      patient: {
        id: "p10",
        mrn: "MRN-00010",
        firstName: "Rahul",
        lastName: "Sharma",
        phone: "9876543210",
      },
    } as any);
  });

  it("renders form fields", () => {
    render(<WalkInForm />);
    expect(screen.getByPlaceholderText("Rahul")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Sharma")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("9876543210")).toBeInTheDocument();
    expect(screen.getByText("Quick Register")).toBeInTheDocument();
  });

  it("submits and shows success state", async () => {
    render(<WalkInForm />);
    fireEvent.change(screen.getByPlaceholderText("Rahul"), {
      target: { value: "Rahul" },
    });
    fireEvent.change(screen.getByPlaceholderText("Sharma"), {
      target: { value: "Sharma" },
    });
    fireEvent.change(screen.getByPlaceholderText("9876543210"), {
      target: { value: "9876543210" },
    });
    fireEvent.click(screen.getByText("Quick Register"));

    await waitFor(() => {
      expect(mockWalkIn).toHaveBeenCalledWith({
        firstName: "Rahul",
        lastName: "Sharma",
        phone: "9876543210",
      });
    });
    await waitFor(() => {
      expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
      expect(screen.getByText(/MRN-00010/)).toBeInTheDocument();
    });
  });

  it("shows error when registration fails", async () => {
    mockWalkIn.mockResolvedValue({
      ok: false,
      error: "Phone number already registered",
    } as any);
    render(<WalkInForm />);
    fireEvent.change(screen.getByPlaceholderText("Rahul"), {
      target: { value: "Rahul" },
    });
    fireEvent.change(screen.getByPlaceholderText("Sharma"), {
      target: { value: "Sharma" },
    });
    fireEvent.change(screen.getByPlaceholderText("9876543210"), {
      target: { value: "9876543210" },
    });
    fireEvent.click(screen.getByText("Quick Register"));
    await waitFor(() => {
      expect(screen.getByText("Phone number already registered")).toBeInTheDocument();
    });
  });

  it("calls onRegistered callback after success", async () => {
    const onRegistered = vi.fn();
    render(<WalkInForm onRegistered={onRegistered} />);
    fireEvent.change(screen.getByPlaceholderText("Rahul"), {
      target: { value: "Rahul" },
    });
    fireEvent.change(screen.getByPlaceholderText("Sharma"), {
      target: { value: "Sharma" },
    });
    fireEvent.change(screen.getByPlaceholderText("9876543210"), {
      target: { value: "9876543210" },
    });
    fireEvent.click(screen.getByText("Quick Register"));
    await waitFor(() => {
      expect(onRegistered).toHaveBeenCalledWith("p10", "Rahul Sharma");
    });
  });

  it("allows registering another patient after success", async () => {
    render(<WalkInForm />);
    fireEvent.change(screen.getByPlaceholderText("Rahul"), {
      target: { value: "Rahul" },
    });
    fireEvent.change(screen.getByPlaceholderText("Sharma"), {
      target: { value: "Sharma" },
    });
    fireEvent.change(screen.getByPlaceholderText("9876543210"), {
      target: { value: "9876543210" },
    });
    fireEvent.click(screen.getByText("Quick Register"));
    await waitFor(() => expect(screen.getByText("Rahul Sharma")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Register Another"));
    expect(screen.getByPlaceholderText("Rahul")).toBeInTheDocument();
  });
});
