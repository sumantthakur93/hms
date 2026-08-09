"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import type { UserRole } from "@/types/next-auth";

// ─── Authorization ─────────────────────────────────────────────────────────────

function requireAdmin(session: { user: { role: UserRole } } | null) {
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const scheduleBlockSchema = z
  .object({
    doctorId: z.string().min(1, "Doctor is required"),
    dayOfWeek: z.number().int().min(0).max(6, "Day must be 0–6"),
    startTime: z
      .string()
      .regex(TIME_REGEX, "Start time must be HH:mm (00-23:00-59)"),
    endTime: z
      .string()
      .regex(TIME_REGEX, "End time must be HH:mm (00-23:00-59)"),
    slotDuration: z
      .number()
      .int()
      .min(5)
      .max(120, "Slot duration must be 5–120 minutes"),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: "Start time must be before end time",
    path: ["endTime"],
  });

export type ScheduleBlockInput = z.infer<typeof scheduleBlockSchema>;

const blockedDateSchema = z.object({
  doctorId: z.string().min(1, "Doctor is required"),
  date: z.string().min(1, "Date is required"),
  reason: z.string().optional(),
});

export type BlockedDateInput = z.infer<typeof blockedDateSchema>;

// ─── Doctor list ───────────────────────────────────────────────────────────────

export async function getDoctors() {
  const session = await auth();
  requireAdmin(session);

  const doctors = await prisma.doctorProfile.findMany({
    include: {
      user: { select: { name: true } },
      department: { select: { name: true } },
      scheduleBlocks: { orderBy: { dayOfWeek: "asc" } },
      blockedDates: { orderBy: { date: "desc" }, take: 10 },
    },
    orderBy: { user: { name: "asc" } },
  });

  return doctors.map((d) => ({
    id: d.id,
    name: d.user.name ?? "",
    specialization: d.specialization,
    department: d.department.name,
    scheduleBlocks: d.scheduleBlocks,
    blockedDates: d.blockedDates,
  }));
}

// ─── Schedule Block CRUD ───────────────────────────────────────────────────────

export async function createScheduleBlock(input: ScheduleBlockInput) {
  const session = await auth();
  requireAdmin(session);

  const parsed = scheduleBlockSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const block = await prisma.scheduleBlock.create({
    data: parsed.data,
  });

  return { ok: true as const, block };
}

export async function updateScheduleBlock(
  blockId: string,
  input: ScheduleBlockInput,
) {
  const session = await auth();
  requireAdmin(session);

  const parsed = scheduleBlockSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const block = await prisma.scheduleBlock.update({
    where: { id: blockId },
    data: parsed.data,
  });

  return { ok: true as const, block };
}

export async function deleteScheduleBlock(blockId: string) {
  const session = await auth();
  requireAdmin(session);

  await prisma.scheduleBlock.delete({
    where: { id: blockId },
  });

  return { ok: true as const };
}

// ─── Blocked Date CRUD ─────────────────────────────────────────────────────────

export async function addBlockedDate(input: BlockedDateInput) {
  const session = await auth();
  requireAdmin(session);

  const parsed = blockedDateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const date = new Date(parsed.data.date);
  date.setUTCHours(0, 0, 0, 0);

  try {
    const blocked = await prisma.blockedDate.create({
      data: {
        doctorId: parsed.data.doctorId,
        date,
        reason: parsed.data.reason || null,
      },
    });

    return { ok: true as const, blocked };
  } catch {
    return {
      ok: false as const,
      error: "This date is already blocked for this doctor",
    };
  }
}

export async function removeBlockedDate(blockedDateId: string) {
  const session = await auth();
  requireAdmin(session);

  await prisma.blockedDate.delete({
    where: { id: blockedDateId },
  });

  return { ok: true as const };
}
