import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/actions/schedule", () => ({
  createScheduleBlock: vi.fn(),
  updateScheduleBlock: vi.fn(),
  deleteScheduleBlock: vi.fn(),
}));

import { ScheduleBlockManager } from "@/components/admin/schedule-block-form";
import {
  createScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
} from "@/actions/schedule";

const mockCreate = vi.mocked(createScheduleBlock);
const mockUpdate = vi.mocked(updateScheduleBlock);
const mockDelete = vi.mocked(deleteScheduleBlock);

const blocks = [
  {
    id: "b1",
    doctorId: "doc1",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "13:00",
    slotDuration: 30,
  },
  {
    id: "b2",
    doctorId: "doc1",
    dayOfWeek: 3,
    startTime: "14:00",
    endTime: "17:00",
    slotDuration: 20,
  },
];

// Helper: find and click the "Add Schedule Block" toggle button
function clickAddBlock() {
  const buttons = screen.getAllByRole("button");
  const addBtn = buttons.find((b) =>
    b.textContent?.includes("Add Schedule Block"),
  );
  fireEvent.click(addBtn!);
}

// Helper: find and click the submit button (type=submit)
function clickSubmit() {
  const buttons = screen.getAllByRole("button");
  const submitBtn = buttons.find(
    (b) => (b as HTMLButtonElement).type === "submit",
  );
  fireEvent.click(submitBtn!);
}

describe("ScheduleBlockManager", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
  });

  it("renders existing blocks grouped by day", () => {
    render(<ScheduleBlockManager doctorId="doc1" blocks={blocks} />);
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Wed")).toBeInTheDocument();
    expect(screen.getByText("09:00–13:00")).toBeInTheDocument();
    expect(screen.getByText("14:00–17:00")).toBeInTheDocument();
  });

  it("shows empty state when no blocks", () => {
    render(<ScheduleBlockManager doctorId="doc1" blocks={[]} />);
    expect(screen.getByText(/No schedule blocks yet/)).toBeInTheDocument();
  });

  it("shows form when Add Schedule Block clicked", () => {
    render(<ScheduleBlockManager doctorId="doc1" blocks={[]} />);
    clickAddBlock();
    expect(screen.getByText("New Schedule Block")).toBeInTheDocument();
    expect(screen.getByLabelText("Day of week")).toBeInTheDocument();
  });

  it("creates a new block and updates list without reload", async () => {
    const newBlock = {
      id: "b3",
      doctorId: "doc1",
      dayOfWeek: 2,
      startTime: "10:00",
      endTime: "12:00",
      slotDuration: 15,
    };
    mockCreate.mockResolvedValue({ ok: true, block: newBlock });

    render(<ScheduleBlockManager doctorId="doc1" blocks={[]} />);
    clickAddBlock();
    clickSubmit();

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
      // New block should appear in the list without page reload
      expect(screen.getByText("10:00–12:00")).toBeInTheDocument();
    });
  });

  it("shows edit form with existing values", () => {
    render(<ScheduleBlockManager doctorId="doc1" blocks={blocks} />);
    fireEvent.click(screen.getAllByLabelText("Edit block")[0]);
    expect(screen.getByText("Edit Block")).toBeInTheDocument();
  });

  it("deletes a block and removes it from list", async () => {
    mockDelete.mockResolvedValue({ ok: true });

    render(<ScheduleBlockManager doctorId="doc1" blocks={blocks} />);
    fireEvent.click(screen.getAllByLabelText("Delete block")[0]);
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("b1");
      // Block should be removed from the list
      expect(screen.queryByText("09:00–13:00")).not.toBeInTheDocument();
      // Other block should still be there
      expect(screen.getByText("14:00–17:00")).toBeInTheDocument();
    });
  });

  it("shows error when create fails", async () => {
    mockCreate.mockResolvedValue({
      ok: false,
      error: "Start time must be before end time",
    });

    render(<ScheduleBlockManager doctorId="doc1" blocks={[]} />);
    clickAddBlock();
    clickSubmit();

    await waitFor(() => {
      expect(
        screen.getByText("Start time must be before end time"),
      ).toBeInTheDocument();
    });
  });

  it("allows adding multiple blocks for the same day", async () => {
    const morning = {
      id: "b1",
      doctorId: "doc1",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "12:00",
      slotDuration: 30,
    };
    const afternoon = {
      id: "b2",
      doctorId: "doc1",
      dayOfWeek: 1,
      startTime: "15:00",
      endTime: "17:00",
      slotDuration: 30,
    };

    mockCreate.mockResolvedValue({ ok: true, block: afternoon });

    // Start with one morning block
    render(<ScheduleBlockManager doctorId="doc1" blocks={[morning]} />);

    // Add afternoon block for the same day (Mon = day 1, the default)
    clickAddBlock();
    // Use getByText to find the submit button directly
    fireEvent.click(screen.getByText("Add Block"));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
      // Both blocks should be visible under Monday
      expect(screen.getByText("09:00–12:00")).toBeInTheDocument();
      expect(screen.getByText("15:00–17:00")).toBeInTheDocument();
    });
  });
});
