import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { DoctorDashboard } from "@/components/dashboard/doctor-dashboard";
import { PatientDashboard } from "@/components/dashboard/patient-dashboard";
import { ReceptionistDashboardStats } from "@/components/dashboard/receptionist-dashboard";
import { LabDashboard } from "@/components/dashboard/lab-dashboard";

// ─── Admin Dashboard ───────────────────────────────────────────────────────────

describe("AdminDashboard", () => {
  const emptyData = {
    ok: true as const,
    stats: {
      totalPatients: 0,
      todaysAppointments: 0,
      activeDoctors: 0,
      pendingInvoices: 0,
      todayRevenue: 0,
    },
    recentAppointments: [],
    lowStock: [],
    departments: [],
    recentInvoices: [],
    monthlyRevenue: [],
  };

  it("renders title and stat cards", () => {
    render(<AdminDashboard data={emptyData} />);
    expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Total Patients")).toBeInTheDocument();
    expect(screen.getByText("Active Doctors")).toBeInTheDocument();
  });

  it("shows empty states", () => {
    render(<AdminDashboard data={emptyData} />);
    expect(screen.getByText("No appointments yet")).toBeInTheDocument();
    expect(screen.getByText("All medicines well stocked")).toBeInTheDocument();
    expect(screen.getByText("No invoices yet")).toBeInTheDocument();
  });

  it("shows low stock alerts", () => {
    render(
      <AdminDashboard
        data={{
          ...emptyData,
          lowStock: [
            { id: "m1", name: "Paracetamol", totalStock: 5, reorderLevel: 100 },
          ],
        }}
      />,
    );
    expect(screen.getByText("Paracetamol")).toBeInTheDocument();
    expect(screen.getByText("Restock")).toBeInTheDocument();
  });

  it("shows department breakdown bars", () => {
    render(
      <AdminDashboard
        data={{
          ...emptyData,
          departments: [
            { name: "General Medicine", count: 50 },
            { name: "Cardiology", count: 30 },
          ],
        }}
      />,
    );
    expect(screen.getByText("General Medicine")).toBeInTheDocument();
    expect(screen.getByText("Cardiology")).toBeInTheDocument();
  });

  it("shows today revenue", () => {
    render(
      <AdminDashboard
        data={{
          ...emptyData,
          stats: { ...emptyData.stats, todayRevenue: 1500 },
        }}
      />,
    );
    expect(screen.getByText("₹1500.00")).toBeInTheDocument();
  });
});

// ─── Doctor Dashboard ──────────────────────────────────────────────────────────

describe("DoctorDashboard", () => {
  const emptyData = {
    ok: true as const,
    stats: {
      todaysAppointments: 0,
      patientsSeenToday: 0,
      pendingLabResults: 0,
    },
    todaysAppointments: [],
    upcomingAppointments: [],
    recentPatients: [],
  };

  it("renders title and stat cards", () => {
    render(<DoctorDashboard data={emptyData} />);
    expect(screen.getByText("Doctor Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Today's Appointments")).toBeInTheDocument();
    expect(screen.getByText("Patients Seen Today")).toBeInTheDocument();
    expect(screen.getByText("Pending Lab Results")).toBeInTheDocument();
  });

  it("shows empty state for no appointments", () => {
    render(<DoctorDashboard data={emptyData} />);
    expect(screen.getByText("No appointments today")).toBeInTheDocument();
  });

  it("shows Start Consultation for CHECKED_IN appointment", () => {
    render(
      <DoctorDashboard
        data={{
          ...emptyData,
          todaysAppointments: [
            {
              id: "a1",
              startTime: "09:00",
              endTime: "09:30",
              status: "CHECKED_IN",
              patientName: "John Doe",
              mrn: "MRN-001",
              patientId: "p1",
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Start Consultation")).toBeInTheDocument();
  });

  it("shows View for COMPLETED appointment", () => {
    render(
      <DoctorDashboard
        data={{
          ...emptyData,
          todaysAppointments: [
            {
              id: "a1",
              startTime: "09:00",
              endTime: "09:30",
              status: "COMPLETED",
              patientName: "Jane Doe",
              mrn: "MRN-002",
              patientId: "p2",
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("View")).toBeInTheDocument();
  });
});

// ─── Patient Dashboard ─────────────────────────────────────────────────────────

describe("PatientDashboard", () => {
  const emptyData = {
    ok: true as const,
    patientName: "John",
    nextAppointment: null,
    stats: { activePrescriptions: 0, pendingLabResults: 0 },
    activities: [],
  };

  it("renders greeting with name", () => {
    render(<PatientDashboard data={emptyData} />);
    expect(screen.getByText("Welcome back, John")).toBeInTheDocument();
  });

  it("shows Book Appointment CTA", () => {
    render(<PatientDashboard data={emptyData} />);
    expect(screen.getAllByText("Book Appointment").length).toBeGreaterThan(0);
  });

  it("shows empty state for no next appointment", () => {
    render(<PatientDashboard data={emptyData} />);
    expect(screen.getByText("No upcoming appointment")).toBeInTheDocument();
  });

  it("shows next appointment details", () => {
    render(
      <PatientDashboard
        data={{
          ...emptyData,
          nextAppointment: {
            id: "a1",
            date: new Date("2025-12-01"),
            startTime: "10:00",
            doctorName: "Smith",
            department: "General Medicine",
          },
        }}
      />,
    );
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
    expect(screen.getByText("General Medicine")).toBeInTheDocument();
  });

  it("shows quick action links", () => {
    render(<PatientDashboard data={emptyData} />);
    expect(screen.getByText("My Appointments")).toBeInTheDocument();
    expect(screen.getByText("Lab Results")).toBeInTheDocument();
    expect(screen.getByText("Chat with AI")).toBeInTheDocument();
  });
});

// ─── Receptionist Dashboard ────────────────────────────────────────────────────

describe("ReceptionistDashboardStats", () => {
  const emptyData = {
    ok: true as const,
    stats: { todaysTotal: 0, checkedIn: 0, waiting: 0, completed: 0 },
    todaysAppointments: [],
    recentInvoices: [],
    monthlyRevenue: [],
  };

  it("renders stat cards", () => {
    render(<ReceptionistDashboardStats data={emptyData} />);
    expect(screen.getByText("Today's Total")).toBeInTheDocument();
    expect(screen.getByText("Checked In")).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows empty state for no appointments", () => {
    render(<ReceptionistDashboardStats data={emptyData} />);
    expect(screen.getByText("No appointments today")).toBeInTheDocument();
  });

  it("shows appointment in table", () => {
    render(
      <ReceptionistDashboardStats
        data={{
          ...emptyData,
          todaysAppointments: [
            {
              id: "a1",
              startTime: "09:00",
              status: "CONFIRMED",
              patientName: "John",
              mrn: "MRN-001",
              doctorName: "Dr. Smith",
              department: "General",
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
  });
});

// ─── Lab Dashboard ─────────────────────────────────────────────────────────────

describe("LabDashboard", () => {
  const emptyData = {
    ok: true as const,
    stats: { pendingTests: 0, inProgress: 0, completedToday: 0 },
    testQueue: [],
  };

  it("renders title and stat cards", () => {
    render(<LabDashboard data={emptyData} />);
    expect(screen.getByText("Lab Technician Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Pending Tests")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Completed Today")).toBeInTheDocument();
  });

  it("shows empty state for no tests", () => {
    render(<LabDashboard data={emptyData} />);
    expect(screen.getByText("No tests in queue")).toBeInTheDocument();
  });

  it("shows test queue with patient and test name", () => {
    render(
      <LabDashboard
        data={{
          ...emptyData,
          testQueue: [
            {
              id: "lt1",
              status: "ORDERED",
              priority: "URGENT",
              createdAt: new Date("2025-01-15"),
              testName: "CBC",
              testCode: "CBC",
              patientName: "John Doe",
              mrn: "MRN-001",
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("CBC")).toBeInTheDocument();
    expect(screen.getByText("Collect Sample")).toBeInTheDocument();
  });
});
