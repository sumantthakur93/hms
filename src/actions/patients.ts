"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import type { UserRole } from "@/types/next-auth";

// ─── Authorization ─────────────────────────────────────────────────────────────

function requireRole(session: { user: { role: UserRole } } | null, ...roles: UserRole[]) {
  if (!session?.user?.role || !roles.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const patientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelation: z.string().optional(),
  allergies: z.string().optional(),
  medicalHistory: z.string().optional(),
});

export type PatientInput = z.infer<typeof patientSchema>;

const updateSchema = patientSchema.partial().omit({ phone: true });

// ─── MRN generation ────────────────────────────────────────────────────────────

async function generateMrn(): Promise<string> {
  const lastPatient = await prisma.patient.findFirst({
    orderBy: { mrn: "desc" },
    select: { mrn: true },
  });
  const nextNum = lastPatient
    ? parseInt(lastPatient.mrn.replace("MRN-", ""), 10) + 1
    : 1;
  return `MRN-${String(nextNum).padStart(5, "0")}`;
}

// ─── Server Actions ────────────────────────────────────────────────────────────

/**
 * Walk-in patient registration (Receptionist/Admin only).
 * Creates a Patient record without a User account.
 */
export async function createPatient(input: PatientInput) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN");

  const parsed = patientSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const data = parsed.data;
  const mrn = await generateMrn();

  const patient = await prisma.patient.create({
    data: {
      mrn,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      gender: data.gender || null,
      bloodGroup: data.bloodGroup || null,
      address: data.address || null,
      emergencyName: data.emergencyName || null,
      emergencyPhone: data.emergencyPhone || null,
      emergencyRelation: data.emergencyRelation || null,
      allergies: data.allergies || null,
      medicalHistory: data.medicalHistory || null,
    },
    select: { id: true, mrn: true, firstName: true, lastName: true },
  });

  return { ok: true as const, patient };
}

/**
 * Search patients by name, phone, or MRN (contains match).
 * Receptionist/Admin only.
 */
export async function searchPatients(query: string) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN", "DOCTOR");

  const q = query.trim();
  if (q.length < 2) {
    return { ok: true as const, patients: [] };
  }

  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { mrn: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      mrn: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      appointments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
    take: 20,
    orderBy: { lastName: "asc" },
  });

  const results = patients.map((p) => ({
    id: p.id,
    mrn: p.mrn,
    firstName: p.firstName,
    lastName: p.lastName,
    phone: p.phone,
    lastVisit: p.appointments[0]?.createdAt ?? p.createdAt,
  }));

  return { ok: true as const, patients: results };
}

/**
 * Get a single patient by ID (full demographics).
 * Receptionist/Admin/Doctor only.
 */
export async function getPatient(patientId: string) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN", "DOCTOR");

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient) {
    return { ok: false as const, error: "Patient not found" };
  }

  return { ok: true as const, patient };
}

/**
 * Update patient demographics (MRN is immutable).
 * Receptionist/Admin only.
 */
export async function updatePatient(
  patientId: string,
  input: z.infer<typeof updateSchema>,
) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN");

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const data = parsed.data;

  const patient = await prisma.patient.update({
    where: { id: patientId },
    data: {
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.dateOfBirth !== undefined && {
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      }),
      ...(data.gender !== undefined && { gender: data.gender || null }),
      ...(data.bloodGroup !== undefined && { bloodGroup: data.bloodGroup || null }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.emergencyName !== undefined && { emergencyName: data.emergencyName || null }),
      ...(data.emergencyPhone !== undefined && { emergencyPhone: data.emergencyPhone || null }),
      ...(data.emergencyRelation !== undefined && { emergencyRelation: data.emergencyRelation || null }),
      ...(data.allergies !== undefined && { allergies: data.allergies || null }),
      ...(data.medicalHistory !== undefined && { medicalHistory: data.medicalHistory || null }),
    },
    select: { id: true, mrn: true, firstName: true, lastName: true },
  });

  return { ok: true as const, patient };
}
