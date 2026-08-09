"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import type { UserRole } from "@/types/next-auth";

// ─── Authorization ─────────────────────────────────────────────────────────────

function requireRole(
  session: { user: { role: UserRole; patientId?: string } } | null,
  ...roles: UserRole[]
) {
  if (!session?.user?.role || !roles.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const bookAppointmentSchema = z.object({
  doctorId: z.string().min(1, "Doctor is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be HH:mm"),
  reason: z.string().optional(),
  patientId: z.string().optional(), // receptionist books on behalf
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

const rescheduleSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
  newDate: z.string().min(1, "New date is required"),
  newStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:mm"),
  newEndTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be HH:mm"),
});

export type RescheduleInput = z.infer<typeof rescheduleSchema>;

// ─── Slot computation ──────────────────────────────────────────────────────────

export type Slot = {
  startTime: string;
  endTime: string;
  available: boolean;
};

/**
 * Normalize a date string (YYYY-MM-DD) to UTC midnight.
 * Prisma @db.Date stores dates as UTC midnight, so all date queries
 * must use UTC midnight to match correctly regardless of server timezone.
 */
function toDateUTC(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00.000Z");
  return d;
}

/**
 * Compute available time slots for a doctor on a given date.
 * - Generates slots from the doctor's ScheduleBlock for that day-of-week
 * - Returns empty if the date is blocked
 * - Filters out slots that already have a non-cancelled appointment
 */
export async function computeSlots(doctorId: string, date: string) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const dateObj = toDateUTC(date);
  const dayOfWeek = dateObj.getUTCDay();

  // Check blocked dates
  const blocked = await prisma.blockedDate.findUnique({
    where: { doctorId_date: { doctorId, date: dateObj } },
  });
  if (blocked) {
    return { ok: true as const, slots: [] as Slot[] };
  }

  // Get schedule blocks for this day
  const blocks = await prisma.scheduleBlock.findMany({
    where: { doctorId, dayOfWeek },
    orderBy: { startTime: "asc" },
  });
  if (blocks.length === 0) {
    return { ok: true as const, slots: [] as Slot[] };
  }

  // Get existing non-cancelled appointments for this doctor+date
  const existing = await prisma.appointment.findMany({
    where: {
      doctorId,
      date: dateObj,
      status: { not: "CANCELLED" },
    },
    select: { startTime: true },
  });
  const bookedStarts = new Set(existing.map((a) => a.startTime));

  // Generate slots from each block
  const slots: Slot[] = [];
  for (const block of blocks) {
    const [bh, bm] = block.startTime.split(":").map(Number);
    const [eh, em] = block.endTime.split(":").map(Number);
    const startMin = bh * 60 + bm;
    const endMin = eh * 60 + em;
    const dur = block.slotDuration;

    for (let t = startMin; t + dur <= endMin; t += dur) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      const st = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const et_h = Math.floor((t + dur) / 60);
      const et_m = (t + dur) % 60;
      const et = `${String(et_h).padStart(2, "0")}:${String(et_m).padStart(2, "0")}`;
      slots.push({
        startTime: st,
        endTime: et,
        available: !bookedStarts.has(st),
      });
    }
  }

  return { ok: true as const, slots };
}

// ─── Book appointment ──────────────────────────────────────────────────────────

export async function bookAppointment(input: BookAppointmentInput) {
  const session = await auth();
  const user = requireRole(session, "PATIENT", "RECEPTIONIST");

  const parsed = bookAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const {
    doctorId,
    date,
    startTime,
    endTime,
    reason,
    patientId: inputPatientId,
  } = parsed.data;
  const dateObj = toDateUTC(date);

  // Determine patientId: patient uses their own, receptionist must specify
  let patientId: string;
  if (user.role === "PATIENT") {
    if (!user.patientId) {
      return { ok: false as const, error: "No patient profile found" };
    }
    patientId = user.patientId;
  } else {
    // Receptionist booking on behalf — patientId must be provided
    if (!inputPatientId) {
      return { ok: false as const, error: "Patient is required" };
    }
    patientId = inputPatientId;
  }

  // Check blocked date
  const blocked = await prisma.blockedDate.findUnique({
    where: { doctorId_date: { doctorId, date: dateObj } },
  });
  if (blocked) {
    return { ok: false as const, error: "This date is blocked for the doctor" };
  }

  // Check for double-booking (unique constraint)
  try {
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        date: dateObj,
        startTime,
        endTime,
        status: "CONFIRMED",
        reason: reason || null,
      },
    });

    return { ok: true as const, appointment };
  } catch {
    return {
      ok: false as const,
      error: "This slot is already booked. Please choose another time.",
    };
  }
}

// ─── Get my appointments ───────────────────────────────────────────────────────

export async function getMyAppointments() {
  const session = await auth();
  const user = requireRole(session, "PATIENT");

  if (!user.patientId) {
    return { ok: false as const, error: "No patient profile found" };
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      patientId: user.patientId,
      status: { not: "CANCELLED" },
    },
    include: {
      doctor: {
        include: {
          user: { select: { name: true } },
          department: { select: { name: true, consultationFee: true } },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  return {
    ok: true as const,
    appointments: appointments.map((a) => ({
      id: a.id,
      doctorId: a.doctorId,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      reason: a.reason,
      originalDate: a.originalDate,
      originalTime: a.originalTime,
      doctorName: a.doctor.user.name ?? "",
      departmentName: a.doctor.department.name,
      consultationFee: a.doctor.department.consultationFee,
    })),
  };
}

// ─── Reschedule appointment ────────────────────────────────────────────────────

export async function rescheduleAppointment(input: RescheduleInput) {
  const session = await auth();
  const user = requireRole(session, "PATIENT", "RECEPTIONIST");

  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { appointmentId, newDate, newStartTime, newEndTime } = parsed.data;
  const newDateObj = toDateUTC(newDate);

  // Fetch the appointment to verify ownership + status
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    return { ok: false as const, error: "Appointment not found" };
  }

  // Patient can only reschedule their own
  if (user.role === "PATIENT" && appointment.patientId !== user.patientId) {
    return { ok: false as const, error: "Unauthorized" };
  }

  if (appointment.status !== "CONFIRMED") {
    return {
      ok: false as const,
      error: "Only confirmed appointments can be rescheduled",
    };
  }

  // Check blocked date for the new date
  const blocked = await prisma.blockedDate.findUnique({
    where: {
      doctorId_date: { doctorId: appointment.doctorId, date: newDateObj },
    },
  });
  if (blocked) {
    return {
      ok: false as const,
      error: "The selected date is blocked for this doctor",
    };
  }

  // Delete old appointment and create new one (to avoid unique constraint issues)
  try {
    await prisma.appointment.delete({ where: { id: appointmentId } });

    const newAppointment = await prisma.appointment.create({
      data: {
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        date: newDateObj,
        startTime: newStartTime,
        endTime: newEndTime,
        status: "CONFIRMED",
        originalDate: appointment.date,
        originalTime: appointment.startTime,
        reason: appointment.reason,
      },
    });

    return { ok: true as const, appointment: newAppointment };
  } catch {
    // Restore original if creation failed
    await prisma.appointment.create({
      data: {
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: "CONFIRMED",
        reason: appointment.reason,
      },
    });
    return {
      ok: false as const,
      error: "The new slot is already booked. Please choose another time.",
    };
  }
}

// ─── Cancel appointment ────────────────────────────────────────────────────────

export async function cancelAppointment(appointmentId: string) {
  const session = await auth();
  const user = requireRole(session, "PATIENT", "RECEPTIONIST");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    return { ok: false as const, error: "Appointment not found" };
  }

  if (user.role === "PATIENT" && appointment.patientId !== user.patientId) {
    return { ok: false as const, error: "Unauthorized" };
  }

  if (appointment.status !== "CONFIRMED") {
    return {
      ok: false as const,
      error: "Only confirmed appointments can be cancelled",
    };
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });

  return { ok: true as const, appointment: updated };
}

// ─── Get doctors by department (for wizard) ────────────────────────────────────

export async function getDoctorsByDepartment(departmentId: string) {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const doctors = await prisma.doctorProfile.findMany({
    where: { departmentId },
    include: {
      user: { select: { name: true } },
      department: { select: { name: true, consultationFee: true } },
      scheduleBlocks: true,
      blockedDates: { where: { date: { gte: new Date() } } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return {
    ok: true as const,
    doctors: doctors.map((d) => ({
      id: d.id,
      name: d.user.name ?? "",
      specialization: d.specialization,
      departmentName: d.department.name,
      consultationFee: d.department.consultationFee,
      scheduleBlocks: d.scheduleBlocks,
      blockedDates: d.blockedDates,
    })),
  };
}

// ─── Get departments for wizard ────────────────────────────────────────────────

export async function getDepartmentsForBooking() {
  const session = await auth();
  if (!session?.user) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const departments = await prisma.department.findMany({
    include: {
      doctors: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return {
    ok: true as const,
    departments: departments.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      consultationFee: d.consultationFee,
      doctorCount: d.doctors.length,
    })),
  };
}

// ─── Receptionist: Today's appointments ────────────────────────────────────────

export async function getTodaysAppointments() {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN");

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const appointments = await prisma.appointment.findMany({
    where: { date: today },
    include: {
      patient: {
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      doctor: {
        include: {
          user: { select: { name: true } },
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return {
    ok: true as const,
    appointments: appointments.map((a) => ({
      id: a.id,
      patientId: a.patientId,
      doctorId: a.doctorId,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      reason: a.reason,
      patientName: `${a.patient.firstName} ${a.patient.lastName}`,
      mrn: a.patient.mrn,
      phone: a.patient.phone,
      doctorName: a.doctor.user.name ?? "",
      departmentName: a.doctor.department.name,
    })),
  };
}

// ─── Receptionist: Check-in ────────────────────────────────────────────────────

export async function checkInAppointment(appointmentId: string) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    return { ok: false as const, error: "Appointment not found" };
  }

  if (appointment.status !== "CONFIRMED") {
    return {
      ok: false as const,
      error: "Only confirmed appointments can be checked in",
    };
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CHECKED_IN" },
  });

  return { ok: true as const, appointment: updated };
}

// ─── Receptionist/Doctor: No-show ──────────────────────────────────────────────

export async function markNoShow(appointmentId: string) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN", "DOCTOR");

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    return { ok: false as const, error: "Appointment not found" };
  }

  if (appointment.status !== "CHECKED_IN") {
    return {
      ok: false as const,
      error: "Only checked-in appointments can be marked as no-show",
    };
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "NO_SHOW" },
  });

  return { ok: true as const, appointment: updated };
}

// ─── Receptionist: Walk-in registration ────────────────────────────────────────

const walkInSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
});

export type WalkInInput = z.infer<typeof walkInSchema>;

// ─── Receptionist: Search patient by phone ─────────────────────────────────────

export async function findPatientByPhone(phone: string) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN");

  if (!phone || phone.trim().length < 4) {
    return { ok: false as const, error: "Enter at least 4 digits" };
  }

  const patient = await prisma.patient.findFirst({
    where: { phone: { contains: phone.trim() } },
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  });

  if (!patient) {
    return {
      ok: false as const,
      error: "No patient found with this phone number",
    };
  }

  return { ok: true as const, patient };
}

export async function walkInRegistration(input: WalkInInput) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN");

  const parsed = walkInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  // Generate MRN
  const lastPatient = await prisma.patient.findFirst({
    orderBy: { mrn: "desc" },
    select: { mrn: true },
  });
  const nextNum = lastPatient
    ? parseInt(lastPatient.mrn.replace("MRN-", ""), 10) + 1
    : 1;
  const mrn = `MRN-${String(nextNum).padStart(5, "0")}`;

  const patient = await prisma.patient.create({
    data: {
      mrn,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
    },
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  });

  return { ok: true as const, patient };
}
