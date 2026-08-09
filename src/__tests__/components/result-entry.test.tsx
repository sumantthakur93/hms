import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/actions/lab", () => ({
  getLabOrder: vi.fn(),
  saveDraftResults: vi.fn(),
  submitResults: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { ResultEntry } from "@/components/lab/result-entry";
import { getLabOrder, saveDraftResults, submitResults } from "@/actions/lab";

const mockGetOrder = vi.mocked(getLabOrder);
const mockSaveDraft = vi.mocked(saveDraftResults);
const mockSubmit = vi.mocked(submitResults);

beforeEach(() => {
  vi.clearAllMocks();
  mockSaveDraft.mockResolvedValue({ ok: true, order: { id: "lt1" } } as any);
  mockSubmit.mockResolvedValue({ ok: true, order: { id: "lt1" } } as any);
});

describe("ResultEntry", () => {
  it("renders patient header and test info", async () => {
    mockGetOrder.mockResolvedValue({
      ok: true,
      order: {
        id: "lt1",
        status: "PROCESSING",
        priority: "NORMAL",
        patient: {
          mrn: "MRN-00001",
          firstName: "John",
          lastName: "Doe",
          gender: "MALE",
          dateOfBirth: new Date("1990-01-15"),
        },
        testType: {
          name: "Complete Blood Count",
          code: "CBC",
          category: "Hematology",
        },
        result: null,
      },
    } as any);
    render(<ResultEntry labTestOrderId="lt1" />);
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Complete Blood Count")).toBeInTheDocument();
    });
  });

  it("pre-fills CBC default rows for CBC test", async () => {
    mockGetOrder.mockResolvedValue({
      ok: true,
      order: {
        id: "lt1",
        status: "SAMPLE_COLLECTED",
        priority: "NORMAL",
        patient: {
          mrn: "MRN-00001",
          firstName: "John",
          lastName: "Doe",
          gender: null,
          dateOfBirth: null,
        },
        testType: { name: "CBC", code: "CBC", category: "Hematology" },
        result: null,
      },
    } as any);
    render(<ResultEntry labTestOrderId="lt1" />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Hemoglobin")).toBeInTheDocument();
      expect(screen.getByDisplayValue("RBC Count")).toBeInTheDocument();
    });
  });

  it("shows Add Row button when editable", async () => {
    mockGetOrder.mockResolvedValue({
      ok: true,
      order: {
        id: "lt1",
        status: "PROCESSING",
        priority: "NORMAL",
        patient: {
          mrn: "MRN-00001",
          firstName: "John",
          lastName: "Doe",
          gender: null,
          dateOfBirth: null,
        },
        testType: { name: "CBC", code: "CBC", category: "Hematology" },
        result: null,
      },
    } as any);
    render(<ResultEntry labTestOrderId="lt1" />);
    await waitFor(() => {
      expect(screen.getByText("Add Row")).toBeInTheDocument();
    });
  });

  it("shows Save Draft and Submit Result buttons when editable", async () => {
    mockGetOrder.mockResolvedValue({
      ok: true,
      order: {
        id: "lt1",
        status: "PROCESSING",
        priority: "NORMAL",
        patient: {
          mrn: "MRN-00001",
          firstName: "John",
          lastName: "Doe",
          gender: null,
          dateOfBirth: null,
        },
        testType: { name: "CBC", code: "CBC", category: "Hematology" },
        result: null,
      },
    } as any);
    render(<ResultEntry labTestOrderId="lt1" />);
    await waitFor(() => {
      expect(screen.getByText("Save Draft")).toBeInTheDocument();
      expect(screen.getByText("Submit Result")).toBeInTheDocument();
    });
  });

  it("hides action buttons when completed", async () => {
    mockGetOrder.mockResolvedValue({
      ok: true,
      order: {
        id: "lt1",
        status: "COMPLETED",
        priority: "NORMAL",
        patient: {
          mrn: "MRN-00001",
          firstName: "John",
          lastName: "Doe",
          gender: null,
          dateOfBirth: null,
        },
        testType: { name: "CBC", code: "CBC", category: "Hematology" },
        result: {
          id: "lr1",
          results: [
            {
              parameter: "Hemoglobin",
              value: "14.5",
              unit: "g/dL",
              referenceRange: "13-17",
            },
          ],
          notes: "Normal",
          fileUrl: null,
        },
      },
    } as any);
    render(<ResultEntry labTestOrderId="lt1" />);
    await waitFor(() => {
      expect(screen.queryByText("Save Draft")).not.toBeInTheDocument();
      expect(screen.queryByText("Submit Result")).not.toBeInTheDocument();
    });
  });

  it("loads existing results from saved draft", async () => {
    mockGetOrder.mockResolvedValue({
      ok: true,
      order: {
        id: "lt1",
        status: "PROCESSING",
        priority: "NORMAL",
        patient: {
          mrn: "MRN-00001",
          firstName: "John",
          lastName: "Doe",
          gender: null,
          dateOfBirth: null,
        },
        testType: { name: "CBC", code: "CBC", category: "Hematology" },
        result: {
          id: "lr1",
          results: [
            {
              parameter: "Glucose",
              value: "95",
              unit: "mg/dL",
              referenceRange: "70-100",
            },
          ],
          notes: "Fasting sample",
          fileUrl: null,
        },
      },
    } as any);
    render(<ResultEntry labTestOrderId="lt1" />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Glucose")).toBeInTheDocument();
      expect(screen.getByDisplayValue("95")).toBeInTheDocument();
    });
  });

  it("shows Urgent badge for urgent priority", async () => {
    mockGetOrder.mockResolvedValue({
      ok: true,
      order: {
        id: "lt1",
        status: "PROCESSING",
        priority: "URGENT",
        patient: {
          mrn: "MRN-00001",
          firstName: "John",
          lastName: "Doe",
          gender: null,
          dateOfBirth: null,
        },
        testType: { name: "CBC", code: "CBC", category: "Hematology" },
        result: null,
      },
    } as any);
    render(<ResultEntry labTestOrderId="lt1" />);
    await waitFor(() => {
      expect(screen.getByText("Urgent")).toBeInTheDocument();
    });
  });

  it("shows error when order not found", async () => {
    mockGetOrder.mockResolvedValue({ ok: false, error: "Not found" } as any);
    render(<ResultEntry labTestOrderId="nonexistent" />);
    await waitFor(() => {
      expect(screen.getByText("Not found")).toBeInTheDocument();
    });
  });
});
