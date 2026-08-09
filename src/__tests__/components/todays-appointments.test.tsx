import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/actions/appointments", () => ({
  checkInAppointment: vi.fn(),
  markNoShow: vi.fn(),
}));

import { TodaysAppointments } from "@/components/receptionist/todays-appointments";
import { checkInAppointment, markNoShow } from "@/actions/appointments";

const mockCheckIn = vi.mocked(checkInAppointment);
const mockNoShow = vi.mocked(markNoShow);

const appointments = [
  {
    id: "apt1",
    patientId: "p1",
    doctorId: "doc1",
    startTime: "09:00",
    endTime: "09:30",
    status: "CONFIRMED",
    reason: null,
    patientName: "Rahul Sharma",
    mrn: "MRN-00001",
    phone: "9876543210",
    doctorName: "Dr. Smith",
    departmentName: "Cardiology",
  },
  {
    id: "apt2",
    patientId: "p2",
    doctorId: "doc1",
    startTime: "10:00",
    endTime: "10:30",
    status: "CHECKED_IN",
    reason: null,
    patientName: "Priya Patel",
    mrn: "MRN-00002",
    phone: "9876543211",
    doctorName: "Dr. Smith",
    departmentName: "Cardiology",
  },
  {
    id: "apt3",
    patientId: "p3",
    doctorId: "doc2",
    startTime: "11:00",
    endTime: "11:30",
    status: "COMPLETED",
    reason: null,
    patientName: "Amit Kumar",
    mrn: "MRN-00003",
    phone: "9876543212",
    doctorName: "Dr. Jones",
    departmentName: "Orthopedics",
  },
];

describe("TodaysAppointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckIn.mockResolvedValue({
      ok: true,
      appointment: { id: "apt1" },
    } as any);
    mockNoShow.mockResolvedValue({
      ok: true,
      appointment: { id: "apt2" },
    } as any);
  });

  it("renders empty state when no appointments", () => {
    render(<TodaysAppointments appointments={[]} />);
    expect(
      screen.getByText("No appointments scheduled for today."),
    ).toBeInTheDocument();
  });

  it("renders stats row with counts", () => {
    render(<TodaysAppointments appointments={appointments} />);
    expect(screen.getByText("Total Today")).toBeInTheDocument();
    expect(screen.getByText("Checked In")).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    // Stats values: total=3, checkedIn=1, waiting=1, completed=1
    const stats = screen.getAllByText("1");
    expect(stats.length).toBeGreaterThanOrEqual(3);
  });

  it("renders all appointments in table", () => {
    render(<TodaysAppointments appointments={appointments} />);
    expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
    expect(screen.getByText("Priya Patel")).toBeInTheDocument();
    expect(screen.getByText("Amit Kumar")).toBeInTheDocument();
  });

  it("shows Check In button for CONFIRMED appointments", () => {
    render(<TodaysAppointments appointments={appointments} />);
    expect(screen.getByText("Check In")).toBeInTheDocument();
  });

  it("shows No Show button for CHECKED_IN appointments", () => {
    render(<TodaysAppointments appointments={appointments} />);
    expect(screen.getByText("No Show")).toBeInTheDocument();
  });

  it("shows invoice placeholder for COMPLETED appointments", () => {
    render(<TodaysAppointments appointments={appointments} />);
    expect(screen.getByText("Invoice → T10")).toBeInTheDocument();
  });

  it("calls checkInAppointment when Check In is clicked", async () => {
    render(<TodaysAppointments appointments={appointments} />);
    fireEvent.click(screen.getByText("Check In"));
    await waitFor(() => {
      expect(mockCheckIn).toHaveBeenCalledWith("apt1");
    });
  });

  it("calls markNoShow when No Show is clicked", async () => {
    render(<TodaysAppointments appointments={appointments} />);
    fireEvent.click(screen.getByText("No Show"));
    await waitFor(() => {
      expect(mockNoShow).toHaveBeenCalledWith("apt2");
    });
  });

  it("shows error when check-in fails", async () => {
    mockCheckIn.mockResolvedValue({
      ok: false,
      error: "Already checked in",
    } as any);
    render(<TodaysAppointments appointments={appointments} />);
    fireEvent.click(screen.getByText("Check In"));
    await waitFor(() => {
      expect(screen.getByText("Already checked in")).toBeInTheDocument();
    });
  });

  it("updates status badge after successful check-in", async () => {
    render(<TodaysAppointments appointments={appointments} />);
    fireEvent.click(screen.getByText("Check In"));
    await waitFor(() => {
      expect(screen.getByText("CHECKED IN")).toBeInTheDocument();
    });
  });
});
