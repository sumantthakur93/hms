"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { UserRole } from "@/types/next-auth";

function requireRole(
  session: { user: { role: UserRole; id: string; profileId?: string; patientId?: string } } | null,
  ...roles: UserRole[]
) {
  if (!session?.user?.role || !roles.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function getPatientProfile(patientId: string) {
  const session = await auth();
  requireRole(session, "ADMIN", "DOCTOR", "RECEPTIONIST");

  const [
    patient,
    consultations,
    prescriptions,
    labOrders,
    appointments,
    invoices,
  ] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: patientId },
    }),

    prisma.consultation.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        doctor: { include: { user: { select: { name: true } } } },
        appointment: { select: { date: true } },
      },
    }),

    prisma.prescription.findMany({
      where: { consultation: { patientId } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        items: { include: { medicine: { select: { name: true } } } },
        consultation: {
          include: {
            doctor: { include: { user: { select: { name: true } } } },
            appointment: { select: { date: true } },
          },
        },
      },
    }),

    prisma.labTestOrder.findMany({
      where: { patientId, isInternal: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        testType: { select: { name: true, code: true } },
        result: true,
      },
    }),

    prisma.appointment.findMany({
      where: { patientId },
      orderBy: { date: "desc" },
      take: 20,
      include: {
        doctor: {
          include: {
            user: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    }),

    prisma.invoice.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (!patient) {
    return { ok: false as const, error: "Patient not found" };
  }

  return {
    ok: true as const,
    patient,
    consultations: consultations.map((c) => ({
      id: c.id,
      symptoms: c.symptoms,
      diagnosis: c.diagnosis,
      notes: c.notes,
      vitals: c.vitals as Record<string, string> | null,
      createdAt: c.createdAt,
      appointmentDate: c.appointment.date,
      doctorName: c.doctor.user.name ?? "—",
    })),
    prescriptions: prescriptions.map((p) => ({
      id: p.id,
      createdAt: p.createdAt,
      appointmentDate: p.consultation.appointment.date,
      doctorName: p.consultation.doctor.user.name ?? "—",
      items: p.items.map((i) => ({
        id: i.id,
        dosage: i.dosage,
        frequency: i.frequency,
        duration: i.duration,
        instructions: i.instructions,
        quantity: i.quantity,
        medicineName: i.medicine.name,
      })),
    })),
    labOrders: labOrders.map((l) => ({
      id: l.id,
      status: l.status,
      priority: l.priority,
      createdAt: l.createdAt,
      testName: l.testType.name,
      testCode: l.testType.code,
      result: l.result
        ? {
            results: l.result.results as Record<string, unknown>[],
            notes: l.result.notes,
          }
        : null,
    })),
    appointments: appointments.map((a) => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      doctorName: a.doctor.user.name ?? "—",
      department: a.doctor.department.name,
    })),
    invoices: invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      status: i.status,
      totalAmount: i.totalAmount,
      createdAt: i.createdAt,
    })),
  };
}
