import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/actions/appointments", () => ({
  getDepartmentsForBooking: vi.fn(),
  getDoctorsByDepartment: vi.fn(),
  computeSlots: vi.fn(),
  bookAppointment: vi.fn(),
}));

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect }: { onSelect?: (d: Date) => void }) => (
    <div data-testid="calendar">
      <button onClick={() => onSelect?.(new Date("2024-03-15T00:00:00"))}>
        Pick Mar 15
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    render?: React.ReactNode;
  }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { BookingWizard } from "@/components/patient/booking-wizard";
import {
  getDepartmentsForBooking,
  getDoctorsByDepartment,
  computeSlots,
  bookAppointment,
} from "@/actions/appointments";

const mockGetDepartments = vi.mocked(getDepartmentsForBooking);
const mockGetDoctors = vi.mocked(getDoctorsByDepartment);
const mockComputeSlots = vi.mocked(computeSlots);
const mockBook = vi.mocked(bookAppointment);

const departments = [
  {
    id: "dept1",
    name: "Cardiology",
    description: "Heart care",
    consultationFee: 1000,
    doctorCount: 2,
  },
  {
    id: "dept2",
    name: "General Medicine",
    description: "General health",
    consultationFee: 500,
    doctorCount: 1,
  },
];

const doctors = [
  {
    id: "doc1",
    name: "Dr. Smith",
    specialization: "Cardiologist",
    departmentName: "Cardiology",
    consultationFee: 1000,
    scheduleBlocks: [
      {
        id: "b1",
        doctorId: "doc1",
        dayOfWeek: 5,
        startTime: "09:00",
        endTime: "13:00",
        slotDuration: 30,
      },
    ],
    blockedDates: [] as {
      id: string;
      doctorId: string;
      date: Date;
      reason: string | null;
    }[],
  },
];

const slots = [
  { startTime: "09:00", endTime: "09:30", available: true },
  { startTime: "09:30", endTime: "10:00", available: false },
  { startTime: "10:00", endTime: "10:30", available: true },
];

// Helper: navigate to a specific step
async function navigateToStep(targetStep: number) {
  // Step 0: Load departments and select one
  fireEvent.click(screen.getByText("Load departments"));
  await waitFor(() =>
    expect(screen.getByText("Cardiology")).toBeInTheDocument(),
  );
  fireEvent.click(screen.getByText("Cardiology"));
  await waitFor(() => expect(mockGetDoctors).toHaveBeenCalledWith("dept1"));

  if (targetStep === 0) return;

  // Wait for Next button to be enabled, then click
  await waitFor(() => {
    const nextBtn = screen.getByText("Next").closest("button");
    expect(nextBtn?.disabled).toBe(false);
  });
  fireEvent.click(screen.getByText("Next"));
  await waitFor(() =>
    expect(screen.getByText("Choose a Doctor")).toBeInTheDocument(),
  );

  if (targetStep === 1) return;

  // Step 1: Select doctor
  fireEvent.click(screen.getByText("Dr. Smith"));
  await waitFor(() => {
    const nextBtn = screen.getByText("Next").closest("button");
    expect(nextBtn?.disabled).toBe(false);
  });
  fireEvent.click(screen.getByText("Next"));
  await waitFor(() =>
    expect(screen.getByText("Pick a Date & Time")).toBeInTheDocument(),
  );

  if (targetStep === 2) return;

  // Step 2: Select date and slot
  fireEvent.click(screen.getByText("Pick a date"));
  fireEvent.click(screen.getByText("Pick Mar 15"));
  await waitFor(() => expect(screen.getByText("09:00")).toBeInTheDocument());
  fireEvent.click(screen.getByText("09:00"));
  fireEvent.click(screen.getByText("Next"));
  await waitFor(() =>
    expect(screen.getByText("Confirm Your Appointment")).toBeInTheDocument(),
  );
}

describe("BookingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDepartments.mockResolvedValue({ ok: true, departments });
    mockGetDoctors.mockResolvedValue({ ok: true, doctors });
    mockComputeSlots.mockResolvedValue({ ok: true, slots });
    mockBook.mockResolvedValue({
      ok: true,
      appointment: { id: "apt1" },
    } as any);
  });

  it("renders step 1 with load button", () => {
    render(<BookingWizard />);
    expect(screen.getByText("Choose a Department")).toBeInTheDocument();
    expect(screen.getByText("Load departments")).toBeInTheDocument();
  });

  it("loads and displays departments", async () => {
    render(<BookingWizard />);
    fireEvent.click(screen.getByText("Load departments"));
    await waitFor(() => {
      expect(screen.getByText("Cardiology")).toBeInTheDocument();
      expect(screen.getByText("General Medicine")).toBeInTheDocument();
    });
  });

  it("selects department and navigates to doctor step", async () => {
    render(<BookingWizard />);
    await navigateToStep(1);
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
  });

  it("navigates back from doctor to department", async () => {
    render(<BookingWizard />);
    await navigateToStep(1);
    fireEvent.click(screen.getByText("Back"));
    await waitFor(() => {
      expect(screen.getByText("Choose a Department")).toBeInTheDocument();
    });
  });

  it("selects doctor and navigates to date & slot step", async () => {
    render(<BookingWizard />);
    await navigateToStep(2);
    expect(screen.getByText("Pick a Date & Time")).toBeInTheDocument();
  });

  it("selects date, loads slots, and selects a slot", async () => {
    render(<BookingWizard />);
    await navigateToStep(2);
    // Pick date
    fireEvent.click(screen.getByText("Pick a date"));
    fireEvent.click(screen.getByText("Pick Mar 15"));
    await waitFor(() => {
      expect(mockComputeSlots).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText("09:00")).toBeInTheDocument();
    });
    // Disabled slot should not be clickable
    const disabledSlot = screen.getByText("09:30").closest("button");
    expect(disabledSlot?.disabled).toBe(true);
  });

  it("shows confirm summary with all details", async () => {
    render(<BookingWizard />);
    await navigateToStep(3);
    expect(screen.getByText("Confirm Your Appointment")).toBeInTheDocument();
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
    expect(screen.getByText("Cardiology")).toBeInTheDocument();
    expect(screen.getByText("₹1000")).toBeInTheDocument();
  });

  it("books appointment and shows success state", async () => {
    render(<BookingWizard />);
    await navigateToStep(3);
    fireEvent.click(screen.getByText("Confirm Booking"));
    await waitFor(() => {
      expect(mockBook).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorId: "doc1",
          startTime: "09:00",
          endTime: "09:30",
        }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText("Appointment Booked!")).toBeInTheDocument();
    });
    // Check success details
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
    expect(screen.getByText("Cardiology")).toBeInTheDocument();
  });

  it("resets wizard when Done is clicked", async () => {
    render(<BookingWizard />);
    await navigateToStep(3);
    fireEvent.click(screen.getByText("Confirm Booking"));
    await waitFor(() =>
      expect(screen.getByText("Appointment Booked!")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Done"));
    await waitFor(() => {
      expect(screen.getByText("Choose a Department")).toBeInTheDocument();
    });
  });

  it("shows error when booking fails", async () => {
    mockBook.mockResolvedValue({
      ok: false,
      error: "This slot is already booked. Please choose another time.",
    });
    render(<BookingWizard />);
    await navigateToStep(3);
    fireEvent.click(screen.getByText("Confirm Booking"));
    await waitFor(() => {
      expect(screen.getByText(/already booked/)).toBeInTheDocument();
    });
  });
});
