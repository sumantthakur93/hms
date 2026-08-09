import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/actions/lab", () => ({
  getLabQueue: vi.fn(),
  collectSample: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { LabQueue } from "@/components/lab/lab-queue";
import { getLabQueue, collectSample } from "@/actions/lab";

const mockGetQueue = vi.mocked(getLabQueue);
const mockCollect = vi.mocked(collectSample);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetQueue.mockResolvedValue({
    ok: true,
    orders: [],
    stats: { pending: 0, inProgress: 0, completedToday: 0 },
  } as any);
  mockCollect.mockResolvedValue({ ok: true, order: { id: "lt1" } } as any);
});

describe("LabQueue", () => {
  it("renders title and stats", async () => {
    mockGetQueue.mockResolvedValue({
      ok: true,
      orders: [],
      stats: { pending: 5, inProgress: 3, completedToday: 12 },
    } as any);
    render(<LabQueue />);
    await waitFor(() => {
      expect(screen.getByText("Lab Test Queue")).toBeInTheDocument();
    });
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("shows empty state when no orders", async () => {
    render(<LabQueue />);
    await waitFor(() => {
      expect(screen.getByText("No tests in queue")).toBeInTheDocument();
    });
  });

  it("renders order with patient name and test type", async () => {
    mockGetQueue.mockResolvedValue({
      ok: true,
      orders: [
        {
          id: "lt1",
          status: "ORDERED",
          priority: "NORMAL",
          createdAt: new Date("2024-01-15T10:00:00"),
          patient: { id: "p1", mrn: "MRN-00001", firstName: "John", lastName: "Doe", gender: "MALE", dateOfBirth: null },
          testType: { name: "Complete Blood Count", code: "CBC", category: "Hematology" },
          result: null,
        },
      ],
      stats: { pending: 1, inProgress: 0, completedToday: 0 },
    } as any);
    render(<LabQueue />);
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText(/Complete Blood Count/)).toBeInTheDocument();
    });
  });

  it("shows Collect Sample button for ORDERED status", async () => {
    mockGetQueue.mockResolvedValue({
      ok: true,
      orders: [
        {
          id: "lt1",
          status: "ORDERED",
          priority: "NORMAL",
          createdAt: new Date(),
          patient: { id: "p1", mrn: "MRN-00001", firstName: "John", lastName: "Doe", gender: null, dateOfBirth: null },
          testType: { name: "CBC", code: "CBC", category: "Hematology" },
          result: null,
        },
      ],
      stats: { pending: 1, inProgress: 0, completedToday: 0 },
    } as any);
    render(<LabQueue />);
    await waitFor(() => {
      expect(screen.getByText("Collect Sample")).toBeInTheDocument();
    });
  });

  it("shows Enter Results button for PROCESSING status", async () => {
    mockGetQueue.mockResolvedValue({
      ok: true,
      orders: [
        {
          id: "lt1",
          status: "PROCESSING",
          priority: "NORMAL",
          createdAt: new Date(),
          patient: { id: "p1", mrn: "MRN-00001", firstName: "John", lastName: "Doe", gender: null, dateOfBirth: null },
          testType: { name: "CBC", code: "CBC", category: "Hematology" },
          result: { id: "lr1" },
        },
      ],
      stats: { pending: 0, inProgress: 1, completedToday: 0 },
    } as any);
    render(<LabQueue />);
    await waitFor(() => {
      expect(screen.getByText("Enter Results")).toBeInTheDocument();
    });
  });

  it("shows View button for COMPLETED status", async () => {
    mockGetQueue.mockResolvedValue({
      ok: true,
      orders: [
        {
          id: "lt1",
          status: "COMPLETED",
          priority: "NORMAL",
          createdAt: new Date(),
          patient: { id: "p1", mrn: "MRN-00001", firstName: "John", lastName: "Doe", gender: null, dateOfBirth: null },
          testType: { name: "CBC", code: "CBC", category: "Hematology" },
          result: { id: "lr1" },
        },
      ],
      stats: { pending: 0, inProgress: 0, completedToday: 1 },
    } as any);
    render(<LabQueue />);
    await waitFor(() => {
      expect(screen.getByText("View")).toBeInTheDocument();
    });
  });

  it("shows Urgent badge for urgent priority", async () => {
    mockGetQueue.mockResolvedValue({
      ok: true,
      orders: [
        {
          id: "lt1",
          status: "ORDERED",
          priority: "URGENT",
          createdAt: new Date(),
          patient: { id: "p1", mrn: "MRN-00001", firstName: "John", lastName: "Doe", gender: null, dateOfBirth: null },
          testType: { name: "CBC", code: "CBC", category: "Hematology" },
          result: null,
        },
      ],
      stats: { pending: 1, inProgress: 0, completedToday: 0 },
    } as any);
    render(<LabQueue />);
    await waitFor(() => {
      expect(screen.getByText("Urgent")).toBeInTheDocument();
    });
  });

  it("calls collectSample when Collect Sample clicked", async () => {
    mockGetQueue.mockResolvedValue({
      ok: true,
      orders: [
        {
          id: "lt1",
          status: "ORDERED",
          priority: "NORMAL",
          createdAt: new Date(),
          patient: { id: "p1", mrn: "MRN-00001", firstName: "John", lastName: "Doe", gender: null, dateOfBirth: null },
          testType: { name: "CBC", code: "CBC", category: "Hematology" },
          result: null,
        },
      ],
      stats: { pending: 1, inProgress: 0, completedToday: 0 },
    } as any);
    render(<LabQueue />);
    await waitFor(() => {
      expect(screen.getByText("Collect Sample")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Collect Sample"));
    await waitFor(() => {
      expect(mockCollect).toHaveBeenCalledWith("lt1");
    });
  });

  it("renders filter buttons", async () => {
    render(<LabQueue />);
    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
      expect(screen.getByText("ORDERED")).toBeInTheDocument();
    });
  });
});
