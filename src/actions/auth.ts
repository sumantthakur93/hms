"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { z } from "zod";
import type { UserRole } from "@/types/next-auth";

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * Check if a patient with the given phone number already exists.
 * Returns true if a duplicate exists.
 */
export async function checkDuplicatePhone(phone: string) {
  const existing = await prisma.patient.findFirst({
    where: { phone },
    select: { id: true, firstName: true, lastName: true },
  });
  return { duplicate: !!existing, existingPatient: existing };
}

/**
 * Register a new patient with a User account (self-registration).
 * Creates User (role PATIENT) + Patient record, links them, generates MRN.
 */
export async function signupPatient(input: SignupInput) {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const data = parsed.data;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existingUser) {
    return {
      ok: false as const,
      error: "An account with this email already exists",
    };
  }

  // Generate MRN — find the highest existing MRN number and increment
  const lastPatient = await prisma.patient.findFirst({
    orderBy: { mrn: "desc" },
    select: { mrn: true },
  });
  const nextMrnNum = lastPatient
    ? parseInt(lastPatient.mrn.replace("MRN-", ""), 10) + 1
    : 1;
  const mrn = `MRN-${String(nextMrnNum).padStart(5, "0")}`;

  // Hash password
  const hashedPassword = await hashPassword(data.password);

  // Create User + Patient in a transaction
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: `${data.firstName} ${data.lastName}`,
      password: hashedPassword,
      role: "PATIENT" as UserRole,
      patient: {
        create: {
          mrn,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          gender: data.gender,
          bloodGroup: data.bloodGroup || null,
          address: data.address || null,
          emergencyName: data.emergencyName || null,
          emergencyPhone: data.emergencyPhone || null,
          emergencyRelation: data.emergencyRelation || null,
          allergies: data.allergies || null,
          medicalHistory: data.medicalHistory || null,
        },
      },
    },
    include: { patient: true },
  });

  return { ok: true as const, userId: user.id, mrn };
}
