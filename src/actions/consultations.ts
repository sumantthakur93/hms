"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import type { UserRole } from "@/types/next-auth";
import { AppointmentStatus } from "@prisma/client";
import { isWithinEditWindow } from "@/lib/consultation-helpers";

// ─── Authorization ─────────────────────────────────────────────────────────────

function requireRole(
  session: { user: { role: UserRole; profileId?: string } } | null,
  ...roles: UserRole[]
) {
  if (!session?.user?.role || !roles.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const vitalsSchema = z
  .object({
    bp: z.string().optional(),
    pulse: z.string().optional(),
    temp: z.string().optional(),
    weight: z.string().optional(),
    height: z.string().optional(),
    spo2: z.string().optional(),
  })
  .optional();

const consultationSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  vitals: vitalsSchema,
  followUpDate: z.string().optional(), // ISO date YYYY-MM-DD
});

const prescriptionItemSchema = z.object({
  medicineId: z.string().min(1, "Medicine is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.enum(["OD", "BD", "TDS", "QID"]),
  duration: z.string().min(1, "Duration is required"),
  instructions: z.string().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

const prescriptionSchema = z.object({
  consultationId: z.string().min(1, "Consultation ID is required"),
  items: z
    .array(prescriptionItemSchema)
    .min(1, "At least one item is required"),
});

const labOrderSchema = z.object({
  consultationId: z.string().min(1, "Consultation ID is required"),
  patientId: z.string().min(1, "Patient ID is required"),
  testTypeId: z.string().min(1, "Test type is required"),
  priority: z.enum(["NORMAL", "URGENT"]).default("NORMAL"),
  instructions: z.string().optional(),
});

// ─── Server Actions ────────────────────────────────────────────────────────────

/**
 * Start a consultation: sets appointment status to IN_CONSULTATION and
 * creates a Consultation record if one doesn't already exist.
 * Doctor only.
 */
export async function startConsultation(appointmentId: string) {
  const session = await auth();
  const user = requireRole(session, "DOCTOR");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true },
  });

  if (!appointment) {
    return { ok: false as const, error: "Appointment not found" };
  }

  if (appointment.doctorId !== user.profileId) {
    return { ok: false as const, error: "Not your appointment" };
  }

  if (appointment.status !== "CHECKED_IN") {
    return {
      ok: false as const,
      error: "Appointment must be checked in to start consultation",
    };
  }

  // Update appointment status
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.IN_CONSULTATION },
  });

  // Create consultation record if it doesn't exist
  let consultation = await prisma.consultation.findUnique({
    where: { appointmentId },
  });

  if (!consultation) {
    consultation = await prisma.consultation.create({
      data: {
        appointmentId,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
      },
    });
  }

  return {
    ok: true as const,
    consultation,
    patient: appointment.patient,
  };
}

/**
 * Get the consultation for an appointment, with patient info.
 * Doctor only (must own the appointment).
 */
export async function getConsultation(appointmentId: string) {
  const session = await auth();
  const user = requireRole(session, "DOCTOR");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      consultation: {
        include: {
          prescription: { include: { items: { include: { medicine: true } } } },
          labTestOrders: { include: { testType: true, result: true } },
        },
      },
    },
  });

  if (!appointment) {
    return { ok: false as const, error: "Appointment not found" };
  }

  if (appointment.doctorId !== user.profileId) {
    return { ok: false as const, error: "Not your appointment" };
  }

  return { ok: true as const, appointment };
}

/**
 * Save (update) a consultation's clinical fields.
 * Only allowed within the 24h edit window after completion.
 * Doctor only (must own the consultation).
 */
export async function saveConsultation(
  input: z.infer<typeof consultationSchema>,
) {
  const session = await auth();
  const user = requireRole(session, "DOCTOR");

  const parsed = consultationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const consultation = await prisma.consultation.findUnique({
    where: { appointmentId: parsed.data.appointmentId },
  });

  if (!consultation) {
    return { ok: false as const, error: "Consultation not found" };
  }

  if (consultation.doctorId !== user.profileId) {
    return { ok: false as const, error: "Not your consultation" };
  }

  if (!isWithinEditWindow(consultation.completedAt)) {
    return {
      ok: false as const,
      error: "Consultation is locked (past 24h edit window)",
    };
  }

  const updated = await prisma.consultation.update({
    where: { id: consultation.id },
    data: {
      symptoms: parsed.data.symptoms || null,
      diagnosis: parsed.data.diagnosis || null,
      notes: parsed.data.notes || null,
      vitals: (parsed.data.vitals as Record<string, string>) ?? undefined,
      followUpDate: parsed.data.followUpDate
        ? new Date(parsed.data.followUpDate)
        : null,
    },
  });

  return { ok: true as const, consultation: updated };
}

/**
 * Save (create or replace) prescription items for a consultation.
 * Only allowed within 24h edit window AND only if no items have been dispensed.
 * Doctor only (must own the consultation).
 */
export async function savePrescription(
  input: z.infer<typeof prescriptionSchema>,
) {
  const session = await auth();
  const user = requireRole(session, "DOCTOR");

  const parsed = prescriptionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const consultation = await prisma.consultation.findUnique({
    where: { id: parsed.data.consultationId },
    include: {
      prescription: { include: { items: true } },
    },
  });

  if (!consultation) {
    return { ok: false as const, error: "Consultation not found" };
  }

  if (consultation.doctorId !== user.profileId) {
    return { ok: false as const, error: "Not your consultation" };
  }

  if (!isWithinEditWindow(consultation.completedAt)) {
    return {
      ok: false as const,
      error: "Consultation is locked (past 24h edit window)",
    };
  }

  // Check if any existing items have been dispensed
  if (consultation.prescription?.items.some((i) => i.dispensed)) {
    return {
      ok: false as const,
      error:
        "Cannot edit prescription — some items have already been dispensed",
    };
  }

  // Delete existing prescription + items, then create fresh
  if (consultation.prescription) {
    await prisma.prescription.delete({
      where: { id: consultation.prescription.id },
    });
  }

  const prescription = await prisma.prescription.create({
    data: {
      consultationId: consultation.id,
      items: {
        create: parsed.data.items.map((item) => ({
          medicineId: item.medicineId,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions || null,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      items: { include: { medicine: true } },
    },
  });

  return { ok: true as const, prescription };
}

/**
 * Order a lab test for a consultation.
 * Doctor only (must own the consultation).
 */
export async function orderLabTest(input: z.infer<typeof labOrderSchema>) {
  const session = await auth();
  const user = requireRole(session, "DOCTOR");

  const parsed = labOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const consultation = await prisma.consultation.findUnique({
    where: { id: parsed.data.consultationId },
  });

  if (!consultation) {
    return { ok: false as const, error: "Consultation not found" };
  }

  if (consultation.doctorId !== user.profileId) {
    return { ok: false as const, error: "Not your consultation" };
  }

  const labOrder = await prisma.labTestOrder.create({
    data: {
      patientId: parsed.data.patientId,
      doctorId: consultation.doctorId,
      testTypeId: parsed.data.testTypeId,
      consultationId: consultation.id,
      priority: parsed.data.priority,
      instructions: parsed.data.instructions || null,
    },
    include: { testType: true },
  });

  return { ok: true as const, labOrder };
}

/**
 * Complete a consultation: sets appointment to COMPLETED, records completedAt.
 * Doctor only (must own the consultation).
 */
export async function completeConsultation(appointmentId: string) {
  const session = await auth();
  const user = requireRole(session, "DOCTOR");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { consultation: true },
  });

  if (!appointment) {
    return { ok: false as const, error: "Appointment not found" };
  }

  if (appointment.doctorId !== user.profileId) {
    return { ok: false as const, error: "Not your appointment" };
  }

  if (appointment.status !== "IN_CONSULTATION") {
    return {
      ok: false as const,
      error: "Appointment must be in consultation to complete",
    };
  }

  if (!appointment.consultation) {
    return { ok: false as const, error: "No consultation record found" };
  }

  const [updatedAppt, updatedConsultation] = await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.COMPLETED },
    }),
    prisma.consultation.update({
      where: { id: appointment.consultation.id },
      data: { completedAt: new Date() },
    }),
  ]);

  return {
    ok: true as const,
    appointment: updatedAppt,
    consultation: updatedConsultation,
  };
}

/**
 * Get the doctor's appointments for today (or a specific date).
 * Doctor only.
 */
export async function getDoctorAppointments(date?: string) {
  const session = await auth();
  const user = requireRole(session, "DOCTOR");

  if (!user.profileId) {
    return { ok: false as const, error: "No doctor profile" };
  }

  const queryDate = date ? new Date(date) : new Date();
  queryDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(queryDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId: user.profileId,
      date: { gte: queryDate, lt: nextDay },
      status: { not: "CANCELLED" },
    },
    include: {
      patient: {
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          phone: true,
          gender: true,
          dateOfBirth: true,
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return { ok: true as const, appointments };
}

/**
 * Get the patient timeline: past consultations, prescriptions, lab results,
 * and patient demographics for the consultation screen.
 * Doctor only.
 */
export async function getPatientTimeline(patientId: string) {
  const session = await auth();
  requireRole(session, "DOCTOR");

  const [patient, consultations, prescriptions, labOrders] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        mrn: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        bloodGroup: true,
        phone: true,
        email: true,
        address: true,
        allergies: true,
        emergencyName: true,
        emergencyPhone: true,
        emergencyRelation: true,
        medicalHistory: true,
      },
    }),
    prisma.consultation.findMany({
      where: { patientId },
      include: {
        doctor: {
          include: {
            user: { select: { name: true } },
          },
        },
        appointment: { select: { date: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.prescription.findMany({
      where: { consultation: { patientId } },
      include: {
        items: { include: { medicine: true } },
        consultation: {
          include: {
            doctor: { include: { user: { select: { name: true } } } },
            appointment: { select: { date: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.labTestOrder.findMany({
      where: { patientId },
      include: {
        testType: true,
        result: true,
        doctor: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!patient) {
    return { ok: false as const, error: "Patient not found" };
  }

  return {
    ok: true as const,
    patient,
    consultations,
    prescriptions,
    labOrders,
  };
}

/**
 * Get active medicines for the prescription form dropdown.
 * Doctor only.
 */
export async function getActiveMedicines() {
  const session = await auth();
  requireRole(session, "DOCTOR");

  const medicines = await prisma.medicine.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      genericName: true,
      category: true,
      unitPrice: true,
    },
    orderBy: { name: "asc" },
  });

  return { ok: true as const, medicines };
}

/**
 * Get active test types for the lab order form dropdown.
 * Doctor only.
 */
export async function getActiveTestTypes() {
  const session = await auth();
  requireRole(session, "DOCTOR");

  const testTypes = await prisma.testType.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      code: true,
      category: true,
      price: true,
    },
    orderBy: { name: "asc" },
  });

  return { ok: true as const, testTypes };
}

/**
 * Get a prescription by ID for PDF generation.
 * Doctor only.
 */
export async function getPrescription(prescriptionId: string) {
  const session = await auth();
  requireRole(session, "DOCTOR", "RECEPTIONIST", "ADMIN", "PATIENT");

  const prescription = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    include: {
      items: { include: { medicine: true } },
      consultation: {
        include: {
          doctor: { include: { user: { select: { name: true } } } },
          patient: true,
          appointment: { select: { date: true } },
        },
      },
    },
  });

  if (!prescription) {
    return { ok: false as const, error: "Prescription not found" };
  }

  // Patients can only view their own prescriptions
  if (session?.user?.role === "PATIENT") {
    if (prescription.consultation.patientId !== session.user.patientId) {
      return { ok: false as const, error: "Not your prescription" };
    }
  }

  return { ok: true as const, prescription };
}
