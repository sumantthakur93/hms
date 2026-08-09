import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock server actions
vi.mock("@/actions/patients", () => ({
  searchPatients: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import { PatientSearch } from "@/components/receptionist/patient-search";
import { searchPatients } from "@/actions/patients";

const mockSearch = vi.mocked(searchPatients);

describe("PatientSearch", () => {
  beforeEach(() => {
    mockSearch.mockReset();
  });

  it("renders search input", () => {
    render(<PatientSearch />);
    expect(screen.getByPlaceholderText("Search by name, phone, or MRN...")).toBeInTheDocument();
  });

  it("does not search for queries shorter than 2 chars", () => {
    render(<PatientSearch />);
    const input = screen.getByPlaceholderText("Search by name, phone, or MRN...");
    fireEvent.change(input, { target: { value: "a" } });
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("shows no results message when search returns empty", async () => {
    mockSearch.mockResolvedValue({ ok: true, patients: [] });

    render(<PatientSearch />);
    const input = screen.getByPlaceholderText("Search by name, phone, or MRN...");
    fireEvent.change(input, { target: { value: "xyz" } });

    await waitFor(() => {
      expect(screen.getByText(/No patients found/)).toBeInTheDocument();
    });
  });

  it("displays search results", async () => {
    mockSearch.mockResolvedValue({
      ok: true,
      patients: [
        {
          id: "p1",
          mrn: "MRN-00001",
          firstName: "Rahul",
          lastName: "Kumar",
          phone: "+91 98765 43210",
          lastVisit: new Date("2024-06-15"),
        },
      ],
    });

    render(<PatientSearch />);
    const input = screen.getByPlaceholderText("Search by name, phone, or MRN...");
    fireEvent.change(input, { target: { value: "Rahul" } });

    await waitFor(() => {
      expect(screen.getByText("Rahul Kumar")).toBeInTheDocument();
      expect(screen.getByText(/MRN-00001/)).toBeInTheDocument();
    });
  });

  it("shows multiple results", async () => {
    mockSearch.mockResolvedValue({
      ok: true,
      patients: [
        {
          id: "p1", mrn: "MRN-00001", firstName: "Rahul", lastName: "Kumar",
          phone: "+91 98765 43210", lastVisit: new Date("2024-06-15"),
        },
        {
          id: "p2", mrn: "MRN-00002", firstName: "Priya", lastName: "Sharma",
          phone: "+91 98765 43211", lastVisit: new Date("2024-07-01"),
        },
      ],
    });

    render(<PatientSearch />);
    fireEvent.change(screen.getByPlaceholderText("Search by name, phone, or MRN..."), {
      target: { value: "Kumar" },
    });

    await waitFor(() => {
      expect(screen.getByText("Rahul Kumar")).toBeInTheDocument();
      expect(screen.getByText("Priya Sharma")).toBeInTheDocument();
    });
  });
});
