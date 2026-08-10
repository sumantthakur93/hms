import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/components/receptionist/patient-edit-form", () => ({
  PatientEditForm: () => <div data-testid="edit-form">Edit Form</div>,
}));

import { PatientProfile } from "@/components/patient/patient-profile";

const basePatient = {
  id: "p1",
  mrn: "MRN-00001",
  firstName: "John",
  lastName: "Doe",
  phone: "555-0100",
  email: "john@example.com",
  dateOfBirth: new Date("1990-01-01"),
  gender: "MALE",
  bloodGroup: "O+",
  address: null,
  allergies: null,
  emergencyName: null,
  emergencyPhone: null,
  emergencyRelation: null,
  medicalHistory: null,
};

const emptyData = {
  patient: basePatient,
  consultations: [],
  prescriptions: [],
  labOrders: [],
  appointments: [],
  invoices: [],
};

describe("PatientProfile", () => {
  it("renders patient header with name and MRN", () => {
    render(<PatientProfile data={emptyData} role="ADMIN" />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText(/MRN-00001/)).toBeInTheDocument();
  });

  it("shows Edit button for ADMIN", () => {
    render(<PatientProfile data={emptyData} role="ADMIN" />);
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("shows Edit button for RECEPTIONIST", () => {
    render(<PatientProfile data={emptyData} role="RECEPTIONIST" />);
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("hides Edit button for DOCTOR", () => {
    render(<PatientProfile data={emptyData} role="DOCTOR" />);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("shows allergies highlight when present", () => {
    render(
      <PatientProfile
        data={{
          ...emptyData,
          patient: { ...basePatient, allergies: "Penicillin" },
        }}
        role="DOCTOR"
      />,
    );
    expect(screen.getByText(/Penicillin/)).toBeInTheDocument();
  });

  it("shows emergency contact when present", () => {
    render(
      <PatientProfile
        data={{
          ...emptyData,
          patient: {
            ...basePatient,
            emergencyName: "Jane Doe",
            emergencyPhone: "555-0200",
          },
        }}
        role="DOCTOR"
      />,
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("555-0200")).toBeInTheDocument();
  });

  it("renders all 5 tab triggers", () => {
    render(<PatientProfile data={emptyData} role="DOCTOR" />);
    expect(screen.getByText("Timeline")).toBeInTheDocument();
    expect(screen.getAllByText("Appointments").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Prescriptions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lab Results").length).toBeGreaterThan(0);
    expect(screen.getByText("Invoices")).toBeInTheDocument();
  });

  it("shows empty states on each tab", () => {
    render(<PatientProfile data={emptyData} role="DOCTOR" />);
    // Timeline is default tab
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  it("shows timeline filter chips", () => {
    render(<PatientProfile data={emptyData} role="DOCTOR" />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Consultations")).toBeInTheDocument();
  });

  it("renders appointments in table", () => {
    render(
      <PatientProfile
        data={{
          ...emptyData,
          appointments: [
            {
              id: "a1",
              date: new Date("2025-01-15"),
              startTime: "09:00",
              endTime: "09:30",
              status: "COMPLETED",
              doctorName: "Dr. Smith",
              department: "General Medicine",
            },
          ],
        }}
        role="DOCTOR"
      />,
    );
    // Click Appointments tab (first match is the tab trigger)
    fireEvent.click(screen.getAllByText("Appointments")[0]);
    expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
    expect(screen.getByText("General Medicine")).toBeInTheDocument();
  });

  it("renders prescriptions with expandable items", async () => {
    render(
      <PatientProfile
        data={{
          ...emptyData,
          prescriptions: [
            {
              id: "pr1",
              createdAt: new Date("2025-01-10"),
              appointmentDate: new Date("2025-01-10"),
              doctorName: "Dr. Smith",
              items: [
                {
                  id: "pi1",
                  dosage: "1 tablet",
                  frequency: "BD",
                  duration: "5 days",
                  instructions: null,
                  quantity: 10,
                  medicineName: "Paracetamol",
                },
              ],
            },
          ],
        }}
        role="DOCTOR"
      />,
    );
    fireEvent.click(screen.getAllByText("Prescriptions")[0]);
    // The prescription card shows date + item count, expand to see medicine
    const expandBtn = screen.getByText(/1 item/);
    fireEvent.click(expandBtn);
    await waitFor(() => {
      expect(screen.getByText("Paracetamol")).toBeInTheDocument();
    });
  });

  it("renders invoices in table with download button", () => {
    render(
      <PatientProfile
        data={{
          ...emptyData,
          invoices: [
            {
              id: "inv1",
              invoiceNumber: "INV-00001",
              status: "PAID",
              totalAmount: 500,
              createdAt: new Date("2025-01-20"),
            },
          ],
        }}
        role="DOCTOR"
      />,
    );
    fireEvent.click(screen.getByText("Invoices"));
    expect(screen.getByText("INV-00001")).toBeInTheDocument();
  });

  it("opens edit sheet when Edit clicked", async () => {
    render(<PatientProfile data={emptyData} role="ADMIN" />);
    fireEvent.click(screen.getByText("Edit"));
    await waitFor(() => {
      expect(screen.getByTestId("edit-form")).toBeInTheDocument();
    });
  });
});
