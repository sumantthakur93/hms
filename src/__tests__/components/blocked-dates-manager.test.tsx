import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/actions/schedule", () => ({
  addBlockedDate: vi.fn(),
  removeBlockedDate: vi.fn(),
}));

vi.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({
    value,
    onChange,
    id,
  }: {
    value?: string;
    onChange?: (v: string) => void;
    id?: string;
  }) => (
    <input
      type="date"
      id={id}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label="Date"
    />
  ),
}));

import { BlockedDatesManager } from "@/components/admin/blocked-dates-manager";
import { addBlockedDate, removeBlockedDate } from "@/actions/schedule";

const mockAdd = vi.mocked(addBlockedDate);
const mockRemove = vi.mocked(removeBlockedDate);

const blockedDates = [
  {
    id: "bd1",
    doctorId: "doc1",
    date: new Date("2024-12-25"),
    reason: "Christmas",
  },
  { id: "bd2", doctorId: "doc1", date: new Date("2024-01-26"), reason: null },
];

// Helper: find and click the "Block a Date" toggle button (has Plus icon)
function clickBlockADate() {
  const buttons = screen.getAllByRole("button");
  const blockBtn = buttons.find((b) => b.textContent?.includes("Block a Date"));
  fireEvent.click(blockBtn!);
}

// Helper: find and click the submit button (type=submit)
function clickSubmit() {
  const buttons = screen.getAllByRole("button");
  const submitBtn = buttons.find(
    (b) => (b as HTMLButtonElement).type === "submit",
  );
  fireEvent.click(submitBtn!);
}

describe("BlockedDatesManager", () => {
  beforeEach(() => {
    mockAdd.mockReset();
    mockRemove.mockReset();
  });

  it("renders existing blocked dates", () => {
    render(<BlockedDatesManager doctorId="doc1" blockedDates={blockedDates} />);
    expect(screen.getByText("25 Dec 2024")).toBeInTheDocument();
    expect(screen.getByText("Christmas")).toBeInTheDocument();
    expect(screen.getByText("26 Jan 2024")).toBeInTheDocument();
  });

  it("shows empty state when no blocked dates", () => {
    render(<BlockedDatesManager doctorId="doc1" blockedDates={[]} />);
    expect(screen.getByText(/No blocked dates/)).toBeInTheDocument();
  });

  it("shows form when Block a Date clicked", () => {
    render(<BlockedDatesManager doctorId="doc1" blockedDates={[]} />);
    clickBlockADate();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Reason (optional)")).toBeInTheDocument();
  });

  it("adds a blocked date and updates list without reload", async () => {
    const newBlocked = {
      id: "bd3",
      doctorId: "doc1",
      date: new Date("2024-03-15"),
      reason: null,
    };
    mockAdd.mockResolvedValue({ ok: true, blocked: newBlocked });

    render(<BlockedDatesManager doctorId="doc1" blockedDates={[]} />);
    clickBlockADate();
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2024-03-15" },
    });
    clickSubmit();

    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalledWith({
        doctorId: "doc1",
        date: "2024-03-15",
        reason: undefined,
      });
      // New date should appear in the list
      expect(screen.getByText("15 Mar 2024")).toBeInTheDocument();
    });
  });

  it("adds a blocked date with reason", async () => {
    const newBlocked = {
      id: "bd4",
      doctorId: "doc1",
      date: new Date("2024-03-20"),
      reason: "Sick leave",
    };
    mockAdd.mockResolvedValue({ ok: true, blocked: newBlocked });

    render(<BlockedDatesManager doctorId="doc1" blockedDates={[]} />);
    clickBlockADate();
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2024-03-20" },
    });
    fireEvent.change(screen.getByLabelText("Reason (optional)"), {
      target: { value: "Sick leave" },
    });
    clickSubmit();

    await waitFor(() => {
      expect(mockAdd).toHaveBeenCalledWith({
        doctorId: "doc1",
        date: "2024-03-20",
        reason: "Sick leave",
      });
      expect(screen.getByText("Sick leave")).toBeInTheDocument();
    });
  });

  it("shows error for duplicate date", async () => {
    mockAdd.mockResolvedValue({
      ok: false,
      error: "This date is already blocked for this doctor",
    });

    render(<BlockedDatesManager doctorId="doc1" blockedDates={[]} />);
    clickBlockADate();
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2024-01-01" },
    });
    clickSubmit();

    await waitFor(() => {
      expect(screen.getByText(/already blocked/)).toBeInTheDocument();
    });
  });

  it("removes a blocked date and updates list", async () => {
    mockRemove.mockResolvedValue({ ok: true });

    render(<BlockedDatesManager doctorId="doc1" blockedDates={blockedDates} />);
    fireEvent.click(screen.getAllByLabelText("Remove blocked date")[0]);
    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith("bd1");
      // Removed date should disappear
      expect(screen.queryByText("Christmas")).not.toBeInTheDocument();
      // Other date should remain
      expect(screen.getByText("26 Jan 2024")).toBeInTheDocument();
    });
  });
});
