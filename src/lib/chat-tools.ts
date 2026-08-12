import { tool, type Tool } from "ai";
import { z } from "zod";
import type { UserRole } from "@/types/next-auth";
import { prisma } from "@/lib/prisma";
import { bookAppointment, cancelAppointment } from "@/actions/appointments";
import { orderLabTest } from "@/actions/consultations";
import { markPaid } from "@/actions/billing";

// ─── Shared UI config (single source of truth) ───────────────────────────────
// ROLE_BADGES, SUGGESTED_PROMPTS and the message-rendering helpers live here so
// both ChatPanel and ChatPage import from one place (no drift).

export const ROLE_BADGES: Record<UserRole, string> = {
  ADMIN: "Admin mode",
  DOCTOR: "Doctor mode",
  PATIENT: "Patient mode",
  RECEPTIONIST: "Receptionist mode",
  LAB_TECHNICIAN: "Lab mode",
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

// Marker emitted by write tools when they need user confirmation. The UI watches
// for this substring to render Confirm/Cancel controls.
export const PENDING_CONFIRMATION_MARKER = "[CONFIRMATION REQUIRED]";

// ─── Session context injected into every tool ────────────────────────────────

export type ChatSession = {
  user: {
    id: string;
    role: UserRole;
    profileId?: string;
    patientId?: string;
  };
};

type ToolFactory = (session: ChatSession) => Tool;

// ─── Authorization helpers ────────────────────────────────────────────────────

/**
 * Resolve and authorize a patientId for the current session.
 *
 * - PATIENT: always uses their own patientId (the arg is ignored / validated
 *   against it). Fixes "patient can't know their own patientId" and prevents
 *   cross-patient access.
 * - DOCTOR: requires a clinical relationship (appointment or consultation) with
 *   the patient.
 * - RECEPTIONIST / ADMIN / LAB_TECHNICIAN: hospital-wide access (any patient).
 */
async function authorizePatient(
  session: ChatSession,
  patientId: string | undefined,
): Promise<{ ok: true; patientId: string } | { ok: false; error: string }> {
  const { role, patientId: ownPatientId, profileId } = session.user;

  if (role === "PATIENT") {
    if (!ownPatientId) return { ok: false, error: "No patient profile found" };
    if (patientId && patientId !== ownPatientId) {
      return { ok: false, error: "You can only access your own records." };
    }
    return { ok: true, patientId: ownPatientId };
  }

  if (role === "DOCTOR") {
    if (!patientId) return { ok: false, error: "Patient ID is required" };
    if (!profileId) return { ok: false, error: "No doctor profile found" };
    const related = await prisma.appointment.findFirst({
      where: { patientId, doctorId: profileId },
      select: { id: true },
    });
    if (!related) {
      const consulted = await prisma.consultation.findFirst({
        where: { patientId, doctorId: profileId },
        select: { id: true },
      });
      if (!consulted) {
        return {
          ok: false,
          error: "You don't have access to this patient (no clinical relationship).",
        };
      }
    }
    return { ok: true, patientId };
  }

  // RECEPTIONIST / ADMIN / LAB_TECHNICIAN — broad access
  if (!patientId) return { ok: false, error: "Patient ID is required" };
  return { ok: true, patientId };
}

// ─── Read Tools (16) ──────────────────────────────────────────────────────────

const showTodaysAppointments: ToolFactory = (session) =>
  tool({
    description:
      "Show today's appointments. Doctors see only their own; receptionists/admins see all.",
    inputSchema: z.object({}),
    execute: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const where: Record<string, unknown> = {
        date: { gte: today, lt: tomorrow },
        status: { not: "CANCELLED" },
      };
      // Scope to the signed-in doctor (fix: previously showed ALL appointments)
      if (session.user.role === "DOCTOR" && session.user.profileId) {
        where.doctorId = session.user.profileId;
      }

      const appointments = await prisma.appointment.findMany({
        where: where as never,
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
          `- ${a.startTime} ${a.patient.firstName} ${a.patient.lastName} (${a.patient.mrn}) — Dr. ${a.doctor.user.name ?? "—"} [${a.status}] (ID: ${a.id})`,
      );
      return `**Today's Appointments (${appointments.length})**\n\n${lines.join("\n")}`;
    },
  });

const searchPatients: ToolFactory = () =>
  tool({
    description: "Search patients by name, MRN, or phone number",
    inputSchema: z.object({
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

      if (patients.length === 0)
        return `No patients found matching "${query}".`;
      const lines = patients.map(
        (p) =>
          `- ${p.firstName} ${p.lastName} — MRN: ${p.mrn}, Phone: ${p.phone} (ID: ${p.id})`,
      );
      return `**Found ${patients.length} patient(s)**\n\n${lines.join("\n")}`;
    },
  });

const getPatientTimeline: ToolFactory = (session) =>
  tool({
    description:
      "Get the clinical timeline for a patient (appointments, consultations, prescriptions, lab results)",
    inputSchema: z.object({
      patientId: z.string().optional().describe("Patient ID"),
    }),
    execute: async ({ patientId }) => {
      const auth = await authorizePatient(session, patientId);
      if (!auth.ok) return auth.error;
      const pid = auth.patientId;

      const patient = await prisma.patient.findUnique({
        where: { id: pid },
        select: { firstName: true, lastName: true, mrn: true },
      });
      if (!patient) return "Patient not found.";

      const appointments = await prisma.appointment.findMany({
        where: { patientId: pid },
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

const summarizeLastVisit: ToolFactory = (session) =>
  tool({
    description: "Summarize the last consultation/visit for a patient",
    inputSchema: z.object({
      patientId: z.string().optional().describe("Patient ID"),
    }),
    execute: async ({ patientId }) => {
      const auth = await authorizePatient(session, patientId);
      if (!auth.ok) return auth.error;
      const pid = auth.patientId;

      const lastConsultation = await prisma.consultation.findFirst({
        where: { appointment: { patientId: pid } },
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

const listPrescriptions: ToolFactory = (session) =>
  tool({
    description: "List prescriptions for a patient",
    inputSchema: z.object({
      patientId: z.string().optional().describe("Patient ID"),
    }),
    execute: async ({ patientId }) => {
      const auth = await authorizePatient(session, patientId);
      if (!auth.ok) return auth.error;
      const pid = auth.patientId;

      const prescriptions = await prisma.prescription.findMany({
        where: { consultation: { appointment: { patientId: pid } } },
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

const showLabResults: ToolFactory = (session) =>
  tool({
    description: "Show lab results for a patient",
    inputSchema: z.object({
      patientId: z.string().optional().describe("Patient ID"),
    }),
    execute: async ({ patientId }) => {
      const auth = await authorizePatient(session, patientId);
      if (!auth.ok) return auth.error;
      const pid = auth.patientId;

      const results = await prisma.labTestOrder.findMany({
        where: { consultation: { appointment: { patientId: pid } }, isInternal: true },
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

const checkMedicineStock: ToolFactory = () =>
  tool({
    description: "Check medicine stock levels and low-stock alerts",
    inputSchema: z.object({}),
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

const showInvoiceStatus: ToolFactory = () =>
  tool({
    description: "Show invoice status and recent invoices",
    inputSchema: z.object({
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

const getDepartments: ToolFactory = () =>
  tool({
    description: "List all departments with their consultation fees",
    inputSchema: z.object({}),
    execute: async () => {
      const departments = await prisma.department.findMany({
        orderBy: { name: "asc" },
      });
      const lines = departments.map(
        (d) =>
          `- ${d.name} — ₹${d.consultationFee} consultation fee (ID: ${d.id})`,
      );
      return `**Departments (${departments.length})**\n\n${lines.join("\n")}`;
    },
  });

const getDoctorsByDept: ToolFactory = () =>
  tool({
    description: "List doctors in a department",
    inputSchema: z.object({
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
        (d) => `- Dr. ${d.user.name ?? "—"} — ${d.specialization} (ID: ${d.id})`,
      );
      return `**Doctors (${doctors.length})**\n\n${lines.join("\n")}`;
    },
  });

const getLabQueue: ToolFactory = () =>
  tool({
    description: "Show the lab test queue (pending and in-progress tests)",
    inputSchema: z.object({}),
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

const getTestTypes: ToolFactory = () =>
  tool({
    description: "List available lab test types with prices",
    inputSchema: z.object({}),
    execute: async () => {
      const tests = await prisma.testType.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      });
      const lines = tests.map((t) => `- ${t.name} (${t.code}) — ₹${t.price}`);
      return `**Test Types (${tests.length})**\n\n${lines.join("\n")}`;
    },
  });

const getActiveMedicines: ToolFactory = () =>
  tool({
    description: "List active medicines with prices",
    inputSchema: z.object({}),
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

const getPatientNextAppointment: ToolFactory = (session) =>
  tool({
    description:
      "Get the next upcoming appointment for the current patient (uses your own patient record)",
    inputSchema: z.object({
      patientId: z.string().optional().describe("Patient ID (auto-filled for patients)"),
    }),
    execute: async ({ patientId }) => {
      const auth = await authorizePatient(session, patientId);
      if (!auth.ok) return auth.error;
      const pid = auth.patientId;

      const appt = await prisma.appointment.findFirst({
        where: {
          patientId: pid,
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
      return `**Next Appointment**\n- ID: ${appt.id}\n- Date: ${new Date(appt.date).toLocaleDateString()}\n- Time: ${appt.startTime}\n- Doctor: Dr. ${appt.doctor.user.name ?? "—"}\n- Department: ${appt.doctor.department.name}`;
    },
  });

const getPatientAppointments: ToolFactory = (session) =>
  tool({
    description: "List all appointments for a patient",
    inputSchema: z.object({
      patientId: z.string().optional().describe("Patient ID (auto-filled for patients)"),
    }),
    execute: async ({ patientId }) => {
      const auth = await authorizePatient(session, patientId);
      if (!auth.ok) return auth.error;
      const pid = auth.patientId;

      const appts = await prisma.appointment.findMany({
        where: { patientId: pid },
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
          `- ${new Date(a.date).toLocaleDateString()} ${a.startTime} — Dr. ${a.doctor.user.name ?? "—"} [${a.status}] (ID: ${a.id})`,
      );
      return `**Appointments (${appts.length})**\n\n${lines.join("\n")}`;
    },
  });

const getDashboardStats: ToolFactory = () =>
  tool({
    description: "Get dashboard statistics for the current role",
    inputSchema: z.object({}),
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

// ─── Write Tools (5) ──────────────────────────────────────────────────────────
// Two-phase confirmation gate: when `confirm` is false (default) the tool does
// NOT execute the action — it returns a pending-approval summary. The model
// relays it and the UI shows Confirm/Cancel. Only when the user explicitly
// approves and the model re-invokes with `confirm: true` does the action run.
// Server-action role + ownership guards remain the hard security boundary.

const bookAppointmentTool: ToolFactory = () =>
  tool({
    description:
      "Book an appointment for a patient with a doctor. Requires confirmation before executing.",
    inputSchema: z.object({
      doctorId: z.string().describe("Doctor profile ID"),
      date: z.string().describe("Appointment date (YYYY-MM-DD)"),
      startTime: z.string().describe("Start time (HH:mm)"),
      endTime: z.string().describe("End time (HH:mm)"),
      reason: z.string().optional().describe("Reason for visit"),
      patientId: z
        .string()
        .optional()
        .describe("Patient ID (for receptionist booking on behalf)"),
      confirm: z
        .boolean()
        .default(false)
        .describe("Set true only after the user has explicitly confirmed"),
    }),
    execute: async (args) => {
      if (!args.confirm) {
        return `${PENDING_CONFIRMATION_MARKER} Book an appointment on ${args.date} at ${args.startTime}–${args.endTime} with doctor ${args.doctorId}${args.patientId ? ` for patient ${args.patientId}` : ""}${args.reason ? ` (reason: ${args.reason})` : ""}. Reply **yes** to confirm or **no** to cancel.`;
      }
      const result = await bookAppointment(args);
      if (result.ok) {
        const apt = result.appointment;
        return `**Appointment booked successfully**\n- ID: ${apt.id}\n- Date: ${apt.date}\n- Time: ${apt.startTime} – ${apt.endTime}\n- Status: ${apt.status}`;
      }
      return `Failed to book appointment: ${result.error}`;
    },
  });

const cancelAppointmentTool: ToolFactory = () =>
  tool({
    description:
      "Cancel a confirmed appointment. Requires confirmation before executing.",
    inputSchema: z.object({
      appointmentId: z.string().describe("Appointment ID to cancel"),
      confirm: z
        .boolean()
        .default(false)
        .describe("Set true only after the user has explicitly confirmed"),
    }),
    execute: async ({ appointmentId, confirm }) => {
      if (!confirm) {
        return `${PENDING_CONFIRMATION_MARKER} Cancel appointment ${appointmentId}. Reply **yes** to confirm or **no** to cancel.`;
      }
      const result = await cancelAppointment(appointmentId);
      if (result.ok) {
        return `**Appointment cancelled successfully**\n- ID: ${result.appointment.id}\n- Status: ${result.appointment.status}`;
      }
      return `Failed to cancel appointment: ${result.error}`;
    },
  });

const orderLabTestTool: ToolFactory = () =>
  tool({
    description:
      "Order a lab test for a patient during consultation. Requires confirmation before executing.",
    inputSchema: z.object({
      consultationId: z.string().describe("Consultation ID"),
      patientId: z.string().describe("Patient ID"),
      testTypeId: z.string().describe("Test type ID"),
      priority: z
        .enum(["NORMAL", "URGENT"])
        .default("NORMAL")
        .describe("Priority level"),
      instructions: z.string().optional().describe("Special instructions"),
      confirm: z
        .boolean()
        .default(false)
        .describe("Set true only after the user has explicitly confirmed"),
    }),
    execute: async (args) => {
      if (!args.confirm) {
        return `${PENDING_CONFIRMATION_MARKER} Order lab test ${args.testTypeId} (priority ${args.priority}) for patient ${args.patientId} under consultation ${args.consultationId}. Reply **yes** to confirm or **no** to cancel.`;
      }
      const result = await orderLabTest(args);
      if (result.ok) {
        return `**Lab test ordered successfully**\n- Test: ${result.labOrder.testType.name}\n- Priority: ${result.labOrder.priority}\n- Status: ${result.labOrder.status}`;
      }
      return `Failed to order lab test: ${result.error}`;
    },
  });

const createPrescriptionItemTool: ToolFactory = (session) =>
  tool({
    description:
      "Add a medicine to an existing prescription. Requires confirmation before executing.",
    inputSchema: z.object({
      prescriptionId: z.string().describe("Prescription ID"),
      medicineId: z.string().describe("Medicine ID"),
      dosage: z.string().describe("Dosage (e.g. '1 tablet')"),
      frequency: z.enum(["OD", "BD", "TDS", "QID"]).describe("Frequency"),
      duration: z.string().describe("Duration (e.g. '5 days')"),
      quantity: z.number().int().min(1).describe("Quantity to dispense"),
      instructions: z.string().optional().describe("Special instructions"),
      confirm: z
        .boolean()
        .default(false)
        .describe("Set true only after the user has explicitly confirmed"),
    }),
    execute: async (args) => {
      if (!args.confirm) {
        return `${PENDING_CONFIRMATION_MARKER} Add medicine ${args.medicineId} (${args.dosage} ${args.frequency}, ${args.duration}, qty ${args.quantity}) to prescription ${args.prescriptionId}. Reply **yes** to confirm or **no** to cancel.`;
      }
      // Authorization: the prescription must belong to a consultation owned by
      // the signed-in doctor. Previously this tool created rows with no check.
      if (session.user.role === "DOCTOR" && session.user.profileId) {
        const owned = await prisma.prescription.findFirst({
          where: {
            id: args.prescriptionId,
            consultation: { doctorId: session.user.profileId },
          },
          select: { id: true },
        });
        if (!owned) return "Failed to add medicine: not your prescription.";
      }

      try {
        const item = await prisma.prescriptionItem.create({
          data: {
            prescriptionId: args.prescriptionId,
            medicineId: args.medicineId,
            dosage: args.dosage,
            frequency: args.frequency,
            duration: args.duration,
            quantity: args.quantity,
            instructions: args.instructions || null,
          },
          include: { medicine: { select: { name: true } } },
        });
        return `**Medicine added to prescription**\n- ${item.medicine.name} (${item.dosage} ${item.frequency})\n- Duration: ${item.duration}\n- Quantity: ${item.quantity}`;
      } catch (e) {
        return `Failed to add medicine to prescription: ${e instanceof Error ? e.message : "Unknown error"}`;
      }
    },
  });

const recordPaymentTool: ToolFactory = () =>
  tool({
    description:
      "Record a payment for an invoice. Requires confirmation before executing.",
    inputSchema: z.object({
      invoiceId: z.string().describe("Invoice ID"),
      paymentMethod: z
        .enum(["CASH", "UPI", "CARD", "BANK_TRANSFER"])
        .describe("Payment method"),
      transactionRef: z.string().optional().describe("Transaction reference"),
      confirm: z
        .boolean()
        .default(false)
        .describe("Set true only after the user has explicitly confirmed"),
    }),
    execute: async (args) => {
      if (!args.confirm) {
        return `${PENDING_CONFIRMATION_MARKER} Record ${args.paymentMethod} payment for invoice ${args.invoiceId}${args.transactionRef ? ` (ref: ${args.transactionRef})` : ""}. Reply **yes** to confirm or **no** to cancel.`;
      }
      const result = await markPaid(args);
      if (result.ok) {
        return `**Payment recorded successfully**\n- Invoice: ${result.invoice.invoiceNumber}\n- Method: ${result.invoice.paymentMethod}\n- Status: ${result.invoice.status}`;
      }
      return `Failed to record payment: ${result.error}`;
    },
  });

// ─── Tool Registry ─────────────────────────────────────────────────────────────

export const TOOL_FACTORIES: Record<string, ToolFactory> = {
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
};

// Backward-compatible registry (key set preserved). Values are factories, not
// ready tools — use `createChatTools(session)` to get executable tools.
export const ALL_TOOLS = TOOL_FACTORIES;

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

export const ROLE_SYSTEM_PROMPTS: Record<UserRole, string> = {
  ADMIN: `You are the AI Health Assistant for CarePoint Hospital, operating in Admin mode. You can view hospital-wide data including appointments, patients, medicines, invoices, and lab tests. When users ask about specific records, use the available tools to fetch real data. Format responses in Markdown with lists and tables where appropriate. You have no write tools — direct the user to the relevant UI for any changes.\n\nIMPORTANT: Tool outputs may include internal IDs (e.g. appointment IDs, patient IDs). Use these IDs internally when calling other tools, but NEVER display raw IDs to the user. Refer to records by human-readable attributes like patient name, date, time, or doctor name instead.`,
  DOCTOR: `You are the AI Health Assistant for CarePoint Hospital, operating in Doctor mode. You can view your appointments, patient timelines, lab results, and prescriptions for patients you have a clinical relationship with. You can order lab tests and add medicines to prescriptions. Write tools require confirmation: the first call returns a pending-approval summary. Only re-invoke the tool with confirm=true AFTER the user has explicitly replied with an affirmative answer (e.g. "yes", "proceed", "confirm"). If the user declines, do not execute. Use tools to fetch real patient data. Format responses in Markdown.\n\nIMPORTANT: Tool outputs may include internal IDs (e.g. appointment IDs, patient IDs). Use these IDs internally when calling other tools, but NEVER display raw IDs to the user. Refer to records by human-readable attributes like patient name, date, time, or doctor name instead.`,
  PATIENT: `You are the AI Health Assistant for CarePoint Hospital, operating in Patient mode. You can view your own appointments, prescriptions, and lab results — your patient ID is injected automatically, so you never need to ask for it. You can book and cancel appointments. Write tools require confirmation: the first call returns a pending-approval summary. Only re-invoke the tool with confirm=true AFTER the user has explicitly replied with an affirmative answer (e.g. "yes", "proceed", "confirm"). If the user declines, do not execute. Format responses in clear, patient-friendly Markdown.\n\nIMPORTANT: Tool outputs may include internal IDs (e.g. appointment IDs, patient IDs). Use these IDs internally when calling other tools, but NEVER display raw IDs to the user. Refer to records by human-readable attributes like date, time, or doctor name instead.`,
  RECEPTIONIST: `You are the AI Health Assistant for CarePoint Hospital, operating in Receptionist mode. You can search patients, view appointments, and manage billing. You can book/cancel appointments and record payments. Write tools require confirmation: the first call returns a pending-approval summary. Only re-invoke the tool with confirm=true AFTER the user has explicitly replied with an affirmative answer (e.g. "yes", "proceed", "confirm"). If the user declines, do not execute. Use tools to fetch real data. Format responses in Markdown.\n\nIMPORTANT: Tool outputs may include internal IDs (e.g. appointment IDs, patient IDs). Use these IDs internally when calling other tools, but NEVER display raw IDs to the user. Refer to records by human-readable attributes like patient name, date, time, or doctor name instead.`,
  LAB_TECHNICIAN: `You are the AI Health Assistant for CarePoint Hospital, operating in Lab Technician mode. You can view the lab test queue and available test types, and show lab results for a patient. Format responses in Markdown.\n\nIMPORTANT: Tool outputs may include internal IDs. Use these IDs internally when calling other tools, but NEVER display raw IDs to the user. Refer to records by human-readable attributes like patient name, test name, or date instead.`,
};

// ─── Tool builder ─────────────────────────────────────────────────────────────

/**
 * Build the role-filtered, session-scoped tool map for a request.
 * Tools are instantiated per-request so their `execute` closures capture the
 * caller's session for authorization and scoping.
 */
export function createChatTools(session: ChatSession): Record<string, Tool> {
  const allowed = TOOLS_PER_ROLE[session.user.role] ?? [];
  const tools: Record<string, Tool> = {};
  for (const name of allowed) {
    const factory = TOOL_FACTORIES[name];
    if (factory) tools[name] = factory(session);
  }
  return tools;
}
