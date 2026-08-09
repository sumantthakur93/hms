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

  const dateObj = new Date(date + "T00:00:00");
  const dayOfWeek = dateObj.getDay();

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

  const { doctorId, date, startTime, endTime, reason } = parsed.data;
  const dateObj = new Date(date + "T00:00:00");

  // Determine patientId: patient uses their own, receptionist must specify
  let patientId: string;
  if (user.role === "PATIENT") {
    if (!user.patientId) {
      return { ok: false as const, error: "No patient profile found" };
    }
    patientId = user.patientId;
  } else {
    // Receptionist booking on behalf — patientId passed via reason prefix
    // For now, receptionist booking is handled in T6; here we reject
    return {
      ok: false as const,
      error: "Receptionist booking not yet supported",
    };
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
  const newDateObj = new Date(newDate + "T00:00:00");

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
