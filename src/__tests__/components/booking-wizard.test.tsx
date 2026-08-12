import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createContext, useContext, type Context } from "react";

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

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string | null;
    onValueChange: (v: string | null) => void;
    items?: unknown;
    children: React.ReactNode;
  }) => (
    <SelectCtx.Provider value={onValueChange as (v: string) => void}>
      <div data-testid="select" data-value={value ?? ""}>
        {children}
      </div>
    </SelectCtx.Provider>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder ?? ""}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => {
    const onChange = useContext(SelectCtx);
    return (
      <button type="button" onClick={() => onChange(value)}>
        {children}
      </button>
    );
  },
}));

const SelectCtx: Context<(v: string) => void> = createContext<(v: string) => void>(
  () => {},
);

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

// Helper: pick a value from a Select by clicking its SelectItem text.
function pickSelectOption(itemText: string) {
  fireEvent.click(screen.getByText(itemText));
}

// Helper: drive the form all the way to a submittable state.
async function fillForm() {
  // Departments auto-load on mount
  await waitFor(() =>
    expect(screen.getByText("Cardiology · ₹1000")).toBeInTheDocument(),
  );
  pickSelectOption("Cardiology · ₹1000");
  await waitFor(() => expect(mockGetDoctors).toHaveBeenCalledWith("dept1"));

  // Pick doctor
  await waitFor(() =>
    expect(screen.getByText("Dr. Smith · Cardiologist")).toBeInTheDocument(),
  );
  pickSelectOption("Dr. Smith · Cardiologist");

  // Pick date
  fireEvent.click(screen.getByText("Pick a date"));
  fireEvent.click(screen.getByText("Pick Mar 15"));
  await waitFor(() => expect(mockComputeSlots).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByText("09:00")).toBeInTheDocument());

  // Pick slot
  fireEvent.click(screen.getByText("09:00"));
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

  it("auto-loads departments on mount", async () => {
    render(<BookingWizard />);
    await waitFor(() => {
      expect(screen.getByText("Cardiology · ₹1000")).toBeInTheDocument();
      expect(
        screen.getByText("General Medicine · ₹500"),
      ).toBeInTheDocument();
    });
  });

  it("loads doctors when a department is selected", async () => {
    render(<BookingWizard />);
    await waitFor(() =>
      expect(screen.getByText("Cardiology · ₹1000")).toBeInTheDocument(),
    );
    pickSelectOption("Cardiology · ₹1000");
    await waitFor(() => expect(mockGetDoctors).toHaveBeenCalledWith("dept1"));
    await waitFor(() =>
      expect(screen.getByText("Dr. Smith · Cardiologist")).toBeInTheDocument(),
    );
  });

  it("loads slots when doctor + date are selected", async () => {
    render(<BookingWizard />);
    await waitFor(() =>
      expect(screen.getByText("Cardiology · ₹1000")).toBeInTheDocument(),
    );
    pickSelectOption("Cardiology · ₹1000");
    await waitFor(() =>
      expect(screen.getByText("Dr. Smith · Cardiologist")).toBeInTheDocument(),
    );
    pickSelectOption("Dr. Smith · Cardiologist");
    fireEvent.click(screen.getByText("Pick a date"));
    fireEvent.click(screen.getByText("Pick Mar 15"));
    await waitFor(() => expect(mockComputeSlots).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("09:00")).toBeInTheDocument());
  });

  it("disables unavailable slots", async () => {
    render(<BookingWizard />);
    await fillForm();
    const disabledSlot = screen.getByText("09:30").closest("button");
    expect(disabledSlot?.disabled).toBe(true);
  });

  it("shows summary with all details once selected", async () => {
    render(<BookingWizard />);
    await fillForm();
    expect(screen.getByText("Appointment Summary")).toBeInTheDocument();
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
    expect(screen.getByText("Cardiology")).toBeInTheDocument();
    expect(screen.getByText("₹1000")).toBeInTheDocument();
  });

  it("books appointment and shows success state", async () => {
    render(<BookingWizard />);
    await fillForm();
    fireEvent.click(screen.getByText("Book Appointment"));
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
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
    expect(screen.getByText("Cardiology")).toBeInTheDocument();
  });

  it("resets form when Done is clicked", async () => {
    render(<BookingWizard />);
    await fillForm();
    fireEvent.click(screen.getByText("Book Appointment"));
    await waitFor(() =>
      expect(screen.getByText("Appointment Booked!")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("Done"));
    await waitFor(() => {
      expect(screen.getByText("Appointment Summary")).toBeInTheDocument();
    });
  });

  it("shows error when booking fails", async () => {
    mockBook.mockResolvedValue({
      ok: false,
      error: "This slot is already booked. Please choose another time.",
    });
    render(<BookingWizard />);
    await fillForm();
    fireEvent.click(screen.getByText("Book Appointment"));
    await waitFor(() => {
      expect(screen.getByText(/already booked/)).toBeInTheDocument();
    });
  });

  it("disables submit until all fields are selected", async () => {
    render(<BookingWizard />);
    await waitFor(() =>
      expect(screen.getByText("Cardiology · ₹1000")).toBeInTheDocument(),
    );
    const submit = screen.getByText("Book Appointment").closest("button");
    expect(submit?.disabled).toBe(true);
  });
});
