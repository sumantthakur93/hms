import { tool } from "ai";
import { z } from "zod";
import type { UserRole } from "@/types/next-auth";
import { prisma } from "@/lib/prisma";

// ─── Tool definitions ──────────────────────────────────────────────────────────
// 21 tools total: 16 read + 5 write
// Each tool is role-filtered via the TOOLS_PER_ROLE map below.

// ─── Read Tools (16) ───────────────────────────────────────────────────────────

const showTodaysAppointments = tool({
  description:
    "Show today's appointments for the current user (doctor) or all (receptionist/admin)",
  parameters: z.object({}),
  execute: async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        status: { not: "CANCELLED" },
      },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        doctor: {
          include: {
            user: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { startTime: "asc" },
      take: 20,
    });

    if (appointments.length === 0)
      return "No appointments scheduled for today.";
    const lines = appointments.map(
      (a) =>
        `- ${a.startTime} ${a.patient.firstName} ${a.patient.lastName} (${a.patient.mrn}) — Dr. ${a.doctor.user.name ?? "—"} [${a.status}]`,
    );
    return `**Today's Appointments (${appointments.length})**\n\n${lines.join("\n")}`;
  },
});

const searchPatients = tool({
  description: "Search patients by name, MRN, or phone number",
  parameters: z.object({
    query: z.string().describe("Search query — patient name, MRN, or phone"),
  }),
  execute: async ({ query }) => {
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { mrn: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
        ],
      },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        mrn: true,
        phone: true,
        dateOfBirth: true,
      },
    });

    if (patients.length === 0) return `No patients found matching "${query}".`;
    const lines = patients.map(
      (p) =>
        `- ${p.firstName} ${p.lastName} — MRN: ${p.mrn}, Phone: ${p.phone}`,
    );
    return `**Found ${patients.length} patient(s)**\n\n${lines.join("\n")}`;
  },
});

const getPatientTimeline = tool({
  description:
    "Get the clinical timeline for a patient (appointments, consultations, prescriptions, lab results)",
  parameters: z.object({
    patientId: z.string().describe("Patient ID"),
  }),
  execute: async ({ patientId }) => {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { firstName: true, lastName: true, mrn: true },
    });
    if (!patient) return "Patient not found.";

    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      take: 5,
      orderBy: { date: "desc" },
      include: { doctor: { include: { user: { select: { name: true } } } } },
    });

    const lines = appointments.map(
      (a) =>
        `- ${new Date(a.date).toLocaleDateString()} — Dr. ${a.doctor.user.name ?? "—"} [${a.status}]`,
    );
    return `**Patient Timeline: ${patient.firstName} ${patient.lastName} (${patient.mrn})**\n\nRecent appointments:\n${lines.join("\n") || "No appointments found."}`;
  },
});

const summarizeLastVisit = tool({
  description: "Summarize the last consultation/visit for a patient",
  parameters: z.object({
    patientId: z.string().describe("Patient ID"),
  }),
  execute: async ({ patientId }) => {
    const lastConsultation = await prisma.consultation.findFirst({
      where: { appointment: { patientId } },
      orderBy: { createdAt: "desc" },
      include: {
        doctor: { include: { user: { select: { name: true } } } },
        prescription: { include: { items: { include: { medicine: true } } } },
        labTestOrders: { include: { testType: true } },
      },
    });

    if (!lastConsultation)
      return "No consultation history found for this patient.";

    const vitals = lastConsultation.vitals as {
      bp?: string;
      pulse?: string;
      temp?: string;
    } | null;
    const meds = lastConsultation.prescription?.items
      .map((i) => `${i.medicine.name} (${i.dosage} ${i.frequency})`)
      .join(", ");
    const labs = lastConsultation.labTestOrders
      .map((l) => `${l.testType.name} [${l.status}]`)
      .join(", ");

    return `**Last Visit Summary**\n- Date: ${new Date(lastConsultation.createdAt).toLocaleDateString()}\n- Doctor: Dr. ${lastConsultation.doctor.user.name ?? "—"}\n- Vitals: ${vitals ? `BP ${vitals.bp ?? "—"}, Pulse ${vitals.pulse ?? "—"}, Temp ${vitals.temp ?? "—"}` : "Not recorded"}\n- Diagnosis: ${lastConsultation.diagnosis || "—"}\n- Medicines: ${meds || "None"}\n- Lab Orders: ${labs || "None"}`;
  },
});

const listPrescriptions = tool({
  description: "List prescriptions for a patient",
  parameters: z.object({
    patientId: z.string().describe("Patient ID"),
  }),
  execute: async ({ patientId }) => {
    const prescriptions = await prisma.prescription.findMany({
      where: { consultation: { appointment: { patientId } } },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { items: { include: { medicine: { select: { name: true } } } } },
    });

    if (prescriptions.length === 0)
      return "No prescriptions found for this patient.";
    const lines = prescriptions.map(
      (p) =>
        `- ${new Date(p.createdAt).toLocaleDateString()}: ${p.items.map((i) => i.medicine.name).join(", ")}`,
    );
    return `**Prescriptions (${prescriptions.length})**\n\n${lines.join("\n")}`;
  },
});

const showLabResults = tool({
  description: "Show lab results for a patient",
  parameters: z.object({
    patientId: z.string().describe("Patient ID"),
  }),
  execute: async ({ patientId }) => {
    const results = await prisma.labTestOrder.findMany({
      where: { consultation: { appointment: { patientId } }, isInternal: true },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { testType: { select: { name: true } } },
    });

    if (results.length === 0) return "No lab results found for this patient.";
    const lines = results.map(
      (r) =>
        `- ${r.testType.name} [${r.status}] — ${new Date(r.createdAt).toLocaleDateString()}`,
    );
    return `**Lab Results (${results.length})**\n\n${lines.join("\n")}`;
  },
});

const checkMedicineStock = tool({
  description: "Check medicine stock levels and low-stock alerts",
  parameters: z.object({}),
  execute: async () => {
    const medicines = await prisma.medicine.findMany({
      where: { active: true },
      include: { batches: { select: { expiryDate: true, quantity: true } } },
    });

    const now = new Date();
    const lowStock = medicines
      .map((m) => {
        const stock = m.batches
          .filter((b) => new Date(b.expiryDate) > now)
          .reduce((s, b) => s + b.quantity, 0);
        return { name: m.name, stock, reorderLevel: m.reorderLevel };
      })
      .filter((m) => m.stock <= m.reorderLevel);

    if (lowStock.length === 0) return "All medicines are well stocked.";
    const lines = lowStock.map(
      (m) => `- ${m.name}: ${m.stock} units (reorder at ${m.reorderLevel})`,
    );
    return `**Low Stock Alerts (${lowStock.length})**\n\n${lines.join("\n")}`;
  },
});

const showInvoiceStatus = tool({
  description: "Show invoice status and recent invoices",
  parameters: z.object({
    patientId: z
      .string()
      .optional()
      .describe("Optional patient ID to filter invoices"),
  }),
  execute: async ({ patientId }) => {
    const where = patientId ? { patientId } : {};
    const invoices = await prisma.invoice.findMany({
      where,
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });

    if (invoices.length === 0) return "No invoices found.";
    const lines = invoices.map(
      (i) =>
        `- ${i.invoiceNumber}: ₹${i.totalAmount.toFixed(2)} [${i.status}] — ${i.patient.firstName} ${i.patient.lastName}`,
    );
    return `**Recent Invoices (${invoices.length})**\n\n${lines.join("\n")}`;
  },
});

const getDepartments = tool({
  description: "List all departments with their consultation fees",
  parameters: z.object({}),
  execute: async () => {
    const departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    });
    const lines = departments.map(
      (d) => `- ${d.name} — ₹${d.consultationFee} consultation fee`,
    );
    return `**Departments (${departments.length})**\n\n${lines.join("\n")}`;
  },
});

const getDoctorsByDept = tool({
  description: "List doctors in a department",
  parameters: z.object({
    departmentId: z.string().describe("Department ID"),
  }),
  execute: async ({ departmentId }) => {
    const doctors = await prisma.doctorProfile.findMany({
      where: { departmentId },
      include: {
        user: { select: { name: true } },
        department: { select: { name: true } },
      },
    });
    if (doctors.length === 0) return "No doctors found in this department.";
    const lines = doctors.map(
      (d) => `- Dr. ${d.user.name ?? "—"} — ${d.specialization}`,
    );
    return `**Doctors (${doctors.length})**\n\n${lines.join("\n")}`;
  },
});

const getLabQueue = tool({
  description: "Show the lab test queue (pending and in-progress tests)",
  parameters: z.object({}),
  execute: async () => {
    const orders = await prisma.labTestOrder.findMany({
      where: { isInternal: true, status: { in: ["ORDERED", "PROCESSING"] } },
      take: 10,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: {
        testType: { select: { name: true } },
        consultation: {
          include: {
            appointment: {
              include: {
                patient: {
                  select: { firstName: true, lastName: true, mrn: true },
                },
              },
            },
          },
        },
      },
    });
    if (orders.length === 0) return "Lab queue is empty.";
    const lines = orders.map(
      (o) =>
        `- ${o.testType.name} — ${o.consultation?.appointment?.patient?.firstName ?? "—"} [${o.priority}] [${o.status}]`,
    );
    return `**Lab Queue (${orders.length})**\n\n${lines.join("\n")}`;
  },
});

const getTestTypes = tool({
  description: "List available lab test types with prices",
  parameters: z.object({}),
  execute: async () => {
    const tests = await prisma.testType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    const lines = tests.map((t) => `- ${t.name} (${t.code}) — ₹${t.price}`);
    return `**Test Types (${tests.length})**\n\n${lines.join("\n")}`;
  },
});

const getActiveMedicines = tool({
  description: "List active medicines with prices",
  parameters: z.object({}),
  execute: async () => {
    const meds = await prisma.medicine.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        name: true,
        genericName: true,
        unitPrice: true,
        category: true,
      },
    });
    const lines = meds.map(
      (m) =>
        `- ${m.name} (${m.genericName}) — ₹${m.unitPrice} [${m.category ?? "—"}]`,
    );
    return `**Medicines (${meds.length})**\n\n${lines.join("\n")}`;
  },
});

const getPatientNextAppointment = tool({
  description: "Get the next upcoming appointment for the current patient",
  parameters: z.object({
    patientId: z.string().describe("Patient ID"),
  }),
  execute: async ({ patientId }) => {
    const appt = await prisma.appointment.findFirst({
      where: {
        patientId,
        date: { gte: new Date() },
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
      orderBy: { date: "asc" },
      include: {
        doctor: {
          include: {
            user: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    });
    if (!appt) return "You have no upcoming appointments.";
    return `**Next Appointment**\n- Date: ${new Date(appt.date).toLocaleDateString()}\n- Time: ${appt.startTime}\n- Doctor: Dr. ${appt.doctor.user.name ?? "—"}\n- Department: ${appt.doctor.department.name}`;
  },
});

const getPatientAppointments = tool({
  description: "List all appointments for a patient",
  parameters: z.object({
    patientId: z.string().describe("Patient ID"),
  }),
  execute: async ({ patientId }) => {
    const appts = await prisma.appointment.findMany({
      where: { patientId },
      take: 10,
      orderBy: { date: "desc" },
      include: {
        doctor: {
          include: {
            user: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    });
    if (appts.length === 0) return "No appointments found.";
    const lines = appts.map(
      (a) =>
        `- ${new Date(a.date).toLocaleDateString()} ${a.startTime} — Dr. ${a.doctor.user.name ?? "—"} [${a.status}]`,
    );
    return `**Appointments (${appts.length})**\n\n${lines.join("\n")}`;
  },
});

const getDashboardStats = tool({
  description: "Get dashboard statistics for the current role",
  parameters: z.object({}),
  execute: async () => {
    const [patients, doctors, apptsToday, invoices] = await Promise.all([
      prisma.patient.count(),
      prisma.doctorProfile.count(),
      prisma.appointment.count({ where: { status: { not: "CANCELLED" } } }),
      prisma.invoice.count({ where: { status: { in: ["DRAFT", "ISSUED"] } } }),
    ]);
    return `**Hospital Stats**\n- Total Patients: ${patients}\n- Active Doctors: ${doctors}\n- Total Appointments: ${apptsToday}\n- Pending Invoices: ${invoices}`;
  },
});

// ─── Write Tools (5) ───────────────────────────────────────────────────────────
// These require confirmation before executing.
// The actual execution is handled by the API route after approval.

const bookAppointmentTool = tool({
  description: "Book an appointment for a patient with a doctor",
  parameters: z.object({
    doctorId: z.string().describe("Doctor profile ID"),
    date: z.string().describe("Appointment date (YYYY-MM-DD)"),
    startTime: z.string().describe("Start time (HH:mm)"),
    endTime: z.string().describe("End time (HH:mm)"),
    reason: z.string().optional().describe("Reason for visit"),
    patientId: z
      .string()
      .optional()
      .describe("Patient ID (for receptionist booking on behalf)"),
  }),
});

const cancelAppointmentTool = tool({
  description: "Cancel a confirmed appointment",
  parameters: z.object({
    appointmentId: z.string().describe("Appointment ID to cancel"),
  }),
});

const orderLabTestTool = tool({
  description: "Order a lab test for a patient during consultation",
  parameters: z.object({
    consultationId: z.string().describe("Consultation ID"),
    patientId: z.string().describe("Patient ID"),
    testTypeId: z.string().describe("Test type ID"),
    priority: z
      .enum(["NORMAL", "URGENT"])
      .default("NORMAL")
      .describe("Priority level"),
    instructions: z.string().optional().describe("Special instructions"),
  }),
});

const createPrescriptionItemTool = tool({
  description: "Add a medicine to an existing prescription",
  parameters: z.object({
    prescriptionId: z.string().describe("Prescription ID"),
    medicineId: z.string().describe("Medicine ID"),
    dosage: z.string().describe("Dosage (e.g. '1 tablet')"),
    frequency: z.enum(["OD", "BD", "TDS", "QID"]).describe("Frequency"),
    duration: z.string().describe("Duration (e.g. '5 days')"),
    quantity: z.number().int().min(1).describe("Quantity to dispense"),
    instructions: z.string().optional().describe("Special instructions"),
  }),
});

const recordPaymentTool = tool({
  description: "Record a payment for an invoice",
  parameters: z.object({
    invoiceId: z.string().describe("Invoice ID"),
    paymentMethod: z
      .enum(["CASH", "UPI", "CARD", "BANK_TRANSFER"])
      .describe("Payment method"),
    transactionRef: z.string().optional().describe("Transaction reference"),
  }),
});

// ─── Tool Registry ─────────────────────────────────────────────────────────────

export const ALL_TOOLS = {
  showTodaysAppointments,
  searchPatients,
  getPatientTimeline,
  summarizeLastVisit,
  listPrescriptions,
  showLabResults,
  checkMedicineStock,
  showInvoiceStatus,
  getDepartments,
  getDoctorsByDept,
  getLabQueue,
  getTestTypes,
  getActiveMedicines,
  getPatientNextAppointment,
  getPatientAppointments,
  getDashboardStats,
  bookAppointment: bookAppointmentTool,
  cancelAppointment: cancelAppointmentTool,
  orderLabTest: orderLabTestTool,
  createPrescriptionItem: createPrescriptionItemTool,
  recordPayment: recordPaymentTool,
} as const;

export const WRITE_TOOLS = new Set([
  "bookAppointment",
  "cancelAppointment",
  "orderLabTest",
  "createPrescriptionItem",
  "recordPayment",
]);

export const TOOLS_PER_ROLE: Record<UserRole, string[]> = {
  ADMIN: [
    "showTodaysAppointments",
    "searchPatients",
    "getPatientTimeline",
    "summarizeLastVisit",
    "listPrescriptions",
    "showLabResults",
    "checkMedicineStock",
    "showInvoiceStatus",
    "getDepartments",
    "getDoctorsByDept",
    "getLabQueue",
    "getTestTypes",
    "getActiveMedicines",
    "getDashboardStats",
  ],
  DOCTOR: [
    "showTodaysAppointments",
    "searchPatients",
    "getPatientTimeline",
    "summarizeLastVisit",
    "listPrescriptions",
    "showLabResults",
    "getDepartments",
    "getDoctorsByDept",
    "getTestTypes",
    "getActiveMedicines",
    "getPatientAppointments",
    "orderLabTest",
    "createPrescriptionItem",
  ],
  PATIENT: [
    "getPatientNextAppointment",
    "getPatientAppointments",
    "listPrescriptions",
    "showLabResults",
    "getDepartments",
    "getDoctorsByDept",
    "bookAppointment",
    "cancelAppointment",
  ],
  RECEPTIONIST: [
    "showTodaysAppointments",
    "searchPatients",
    "getPatientTimeline",
    "summarizeLastVisit",
    "listPrescriptions",
    "showLabResults",
    "showInvoiceStatus",
    "getDepartments",
    "getDoctorsByDept",
    "getTestTypes",
    "getActiveMedicines",
    "getPatientAppointments",
    "bookAppointment",
    "cancelAppointment",
    "recordPayment",
  ],
  LAB_TECHNICIAN: ["getLabQueue", "getTestTypes", "showLabResults"],
};

export const SUGGESTED_PROMPTS: Record<UserRole, string[]> = {
  ADMIN: [
    "Show today's appointments",
    "Check medicine stock levels",
    "Show recent invoices",
  ],
  DOCTOR: [
    "Show today's appointments",
    "Summarize last visit for a patient",
    "Order CBC for current patient",
  ],
  PATIENT: [
    "When is my next appointment?",
    "Show my last prescription",
    "Book a cardiology appointment",
  ],
  RECEPTIONIST: [
    "Show today's appointments",
    "Search for patient John",
    "Show recent invoices",
  ],
  LAB_TECHNICIAN: ["Show the lab test queue", "List available test types"],
};

export const ROLE_SYSTEM_PROMPTS: Record<UserRole, string> = {
  ADMIN: `You are the AI Health Assistant for CarePoint Hospital, operating in Admin mode. You can view hospital-wide data including appointments, patients, medicines, invoices, and lab tests. When users ask about specific records, use the available tools to fetch real data. Format responses in Markdown with lists and tables where appropriate. For write actions, the system will ask for confirmation before executing.`,
  DOCTOR: `You are the AI Health Assistant for CarePoint Hospital, operating in Doctor mode. You can view your appointments, patient timelines, lab results, and prescriptions. You can order lab tests and add medicines to prescriptions — these require confirmation. Use tools to fetch real patient data. Format responses in Markdown.`,
  PATIENT: `You are the AI Health Assistant for CarePoint Hospital, operating in Patient mode. You can view your own appointments, prescriptions, and lab results. You can book and cancel appointments — these require confirmation. Always use the patient's own ID when fetching their data. Format responses in clear, patient-friendly Markdown.`,
  RECEPTIONIST: `You are the AI Health Assistant for CarePoint Hospital, operating in Receptionist mode. You can search patients, view appointments, and manage billing. You can book/cancel appointments and record payments — these require confirmation. Use tools to fetch real data. Format responses in Markdown.`,
  LAB_TECHNICIAN: `You are the AI Health Assistant for CarePoint Hospital, operating in Lab Technician mode. You can view the lab test queue and available test types. Format responses in Markdown.`,
};
