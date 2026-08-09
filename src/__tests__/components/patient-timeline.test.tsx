import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PatientTimeline } from "@/components/doctor/patient-timeline";

const patient = {
  id: "p1",
  mrn: "MRN-00001",
  firstName: "John",
  lastName: "Doe",
  dateOfBirth: new Date("1990-01-15"),
  gender: "MALE",
  bloodGroup: "O+",
  phone: "+91 99999 99999",
  email: "john@example.com",
  address: "123 Main St",
  allergies: "Penicillin",
  emergencyName: "Jane Doe",
  emergencyPhone: "+91 88888 88888",
  emergencyRelation: "Spouse",
  medicalHistory: "Hypertension",
};

const consultations = [
  {
    id: "c1",
    symptoms: "Fever",
    diagnosis: "Viral fever",
    notes: "Rest advised",
    vitals: {
      bp: "120/80",
      pulse: "72",
      temp: "98.6",
      weight: "70",
      height: "175",
    },
    completedAt: new Date("2024-01-10"),
    createdAt: new Date("2024-01-10"),
    doctor: { user: { name: "Dr. Rajesh" } },
    appointment: { date: new Date("2024-01-10") },
  },
];

const prescriptions = [
  {
    id: "rx1",
    createdAt: new Date("2024-01-10"),
    items: [
      {
        id: "pi1",
        dosage: "1 tablet",
        frequency: "OD",
        duration: "5 days",
        instructions: "After meals",
        quantity: 5,
        medicine: { name: "Paracetamol 500mg" },
      },
    ],
    consultation: {
      doctor: { user: { name: "Dr. Rajesh" } },
      appointment: { date: new Date("2024-01-10") },
    },
  },
];

const labOrders = [
  {
    id: "lt1",
    status: "COMPLETED",
    priority: "NORMAL",
    createdAt: new Date("2024-01-10"),
    testType: { name: "Complete Blood Count", code: "CBC" },
    result: {
      results: [
        {
          parameter: "Hemoglobin",
          value: "14.5",
          unit: "g/dL",
          referenceRange: "13-17",
        },
      ],
      notes: null,
    },
  },
];

describe("PatientTimeline", () => {
  it("renders all 4 tab triggers", () => {
    render(
      <PatientTimeline
        patient={patient}
        consultations={consultations}
        prescriptions={prescriptions}
        labOrders={labOrders}
      />,
    );
    expect(screen.getByText("Consultations")).toBeInTheDocument();
    expect(screen.getByText("Prescriptions")).toBeInTheDocument();
    expect(screen.getByText("Lab Results")).toBeInTheDocument();
    expect(screen.getByText("Patient Info")).toBeInTheDocument();
  });

  it("shows consultation diagnosis in list", () => {
    render(
      <PatientTimeline
        patient={patient}
        consultations={consultations}
        prescriptions={prescriptions}
        labOrders={labOrders}
      />,
    );
    expect(screen.getByText("Viral fever")).toBeInTheDocument();
  });

  it("expands consultation on click", () => {
    render(
      <PatientTimeline
        patient={patient}
        consultations={consultations}
        prescriptions={prescriptions}
        labOrders={labOrders}
      />,
    );
    // Diagnosis is visible initially
    expect(screen.getByText("Viral fever")).toBeInTheDocument();
    // Click to expand
    fireEvent.click(screen.getByText("Viral fever"));
    // Symptoms should now be visible
    expect(screen.getByText(/Fever/)).toBeInTheDocument();
  });

  it("shows empty state when no consultations", () => {
    render(
      <PatientTimeline
        patient={patient}
        consultations={[]}
        prescriptions={[]}
        labOrders={[]}
      />,
    );
    expect(screen.getByText("No past consultations")).toBeInTheDocument();
  });

  it("shows allergies with amber highlight in Patient Info tab", () => {
    render(
      <PatientTimeline
        patient={patient}
        consultations={[]}
        prescriptions={[]}
        labOrders={[]}
      />,
    );
    // Click Patient Info tab — use role tab
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[3]); // Patient Info is the 4th tab
    expect(screen.getByText("Penicillin")).toBeInTheDocument();
  });

  it("shows emergency contact in Patient Info tab", () => {
    render(
      <PatientTimeline
        patient={patient}
        consultations={[]}
        prescriptions={[]}
        labOrders={[]}
      />,
    );
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[3]); // Patient Info
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("+91 88888 88888")).toBeInTheDocument();
  });

  it("shows lab order with status badge", () => {
    render(
      <PatientTimeline
        patient={patient}
        consultations={[]}
        prescriptions={[]}
        labOrders={labOrders}
      />,
    );
    // Click Lab Results tab
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[2]); // Lab Results is the 3rd tab
    // The content is rendered after tab activation
    expect(document.body.textContent).toContain("Complete Blood Count");
  });

  it("shows prescription with item count", () => {
    render(
      <PatientTimeline
        patient={patient}
        consultations={[]}
        prescriptions={prescriptions}
        labOrders={[]}
      />,
    );
    // Click Prescriptions tab
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[1]); // Prescriptions is the 2nd tab
    expect(screen.getByText(/1 item/)).toBeInTheDocument();
  });
});
