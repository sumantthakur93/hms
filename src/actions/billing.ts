"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import type { UserRole } from "@/types/next-auth";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";

// ─── Authorization ─────────────────────────────────────────────────────────────

function requireRole(
  session: { user: { role: UserRole; id: string } } | null,
  ...roles: UserRole[]
) {
  if (!session?.user?.role || !roles.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const markPaidSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER"]),
  transactionRef: z.string().optional(),
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Find the highest invoice number for this year
  const latest = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
  });

  let nextNum = 1;
  if (latest) {
    const match = latest.invoiceNumber.match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }

  return `${prefix}${String(nextNum).padStart(5, "0")}`;
}

// ─── Server Actions ────────────────────────────────────────────────────────────

/**
 * Generate an invoice for a completed appointment.
 * Auto-populates line items: consultation fee, internal lab tests, dispensed medicines.
 * Receptionist/Admin only.
 */
export async function generateInvoice(appointmentId: string) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN");

  // Check if invoice already exists for this appointment
  const existing = await prisma.invoice.findFirst({
    where: { appointmentId },
  });
  if (existing) {
    return { ok: false as const, error: "Invoice already exists for this appointment" };
  }

  // Load appointment with consultation, department, lab orders, prescription
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      doctor: {
        include: {
          department: true,
        },
      },
      consultation: {
        include: {
          labTestOrders: {
            include: {
              testType: true,
            },
          },
          prescription: {
            include: {
              items: {
                include: {
                  medicine: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!appointment) {
    return { ok: false as const, error: "Appointment not found" };
  }

  if (appointment.status !== "COMPLETED") {
    return { ok: false as const, error: "Can only invoice completed appointments" };
  }

  if (!appointment.consultation) {
    return { ok: false as const, error: "No consultation found for this appointment" };
  }

  const items: Array<{
    type: "CONSULTATION_FEE" | "LAB_TEST" | "MEDICINE";
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }> = [];

  // 1. Consultation fee
  const consultationFee = appointment.doctor.department.consultationFee;
  items.push({
    type: "CONSULTATION_FEE",
    description: `Consultation fee — ${appointment.doctor.department.name}`,
    quantity: 1,
    unitPrice: consultationFee,
    amount: consultationFee,
  });

  // 2. Internal lab test charges (only isInternal=true)
  for (const labOrder of appointment.consultation.labTestOrders) {
    if (labOrder.isInternal) {
      items.push({
        type: "LAB_TEST",
        description: `Lab Test: ${labOrder.testType.name}`,
        quantity: 1,
        unitPrice: labOrder.testType.price,
        amount: labOrder.testType.price,
      });
    }
  }

  // 3. Dispensed medicine charges (only dispensed items)
  if (appointment.consultation.prescription) {
    for (const item of appointment.consultation.prescription.items) {
      if (item.dispensed) {
        items.push({
          type: "MEDICINE",
          description: `Medicine: ${item.medicine.name}`,
          quantity: item.quantity,
          unitPrice: item.medicine.unitPrice,
          amount: item.quantity * item.medicine.unitPrice,
        });
      }
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const invoiceNumber = await generateInvoiceNumber();

  // Create invoice with items in a transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        invoiceNumber,
        patientId: appointment.patientId,
        appointmentId,
        status: InvoiceStatus.DRAFT,
        totalAmount,
      },
    });

    for (const item of items) {
      await tx.invoiceItem.create({
        data: {
          invoiceId: inv.id,
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        },
      });
    }

    return inv;
  });

  return { ok: true as const, invoice };
}

/**
 * Get an invoice with items and patient details.
 * Receptionist/Admin/Patient (own invoices only) only.
 */
export async function getInvoice(invoiceId: string) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN", "PATIENT", "DOCTOR");

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
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
      items: true,
      appointment: {
        select: {
          id: true,
          date: true,
          startTime: true,
          doctor: {
            include: {
              department: { select: { name: true } },
              user: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    return { ok: false as const, error: "Invoice not found" };
  }

  // Patients can only view their own invoices
  if (session?.user?.role === "PATIENT") {
    if (invoice.patientId !== session.user.patientId) {
      return { ok: false as const, error: "Not your invoice" };
    }
  }

  return { ok: true as const, invoice };
}

/**
 * List invoices with optional status filter.
 * Receptionist/Admin only.
 */
export async function getInvoices(statusFilter?: string) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN");

  const where: Record<string, unknown> = {};
  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter as InvoiceStatus;
  }

  const invoices = await prisma.invoice.findMany({
    where: where as Record<string, unknown>,
    include: {
      patient: {
        select: { mrn: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return { ok: true as const, invoices };
}

/**
 * Issue a draft invoice — sets status to ISSUED.
 * Receptionist/Admin only.
 */
export async function issueInvoice(invoiceId: string) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN");

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    return { ok: false as const, error: "Invoice not found" };
  }

  if (invoice.status !== "DRAFT") {
    return { ok: false as const, error: "Only draft invoices can be issued" };
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: InvoiceStatus.ISSUED },
  });

  return { ok: true as const, invoice: updated };
}

/**
 * Mark an issued invoice as paid.
 * Receptionist/Admin only.
 */
export async function markPaid(input: z.infer<typeof markPaidSchema>) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN");

  const parsed = markPaidSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: parsed.data.invoiceId },
  });

  if (!invoice) {
    return { ok: false as const, error: "Invoice not found" };
  }

  if (invoice.status !== "ISSUED") {
    return { ok: false as const, error: "Only issued invoices can be marked as paid" };
  }

  const updated = await prisma.invoice.update({
    where: { id: parsed.data.invoiceId },
    data: {
      status: InvoiceStatus.PAID,
      paymentMethod: parsed.data.paymentMethod as PaymentMethod,
      transactionRef: parsed.data.transactionRef || null,
      paidAt: new Date(),
    },
  });

  return { ok: true as const, invoice: updated };
}

/**
 * Cancel an invoice.
 * Receptionist/Admin only.
 */
export async function cancelInvoice(invoiceId: string) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN");

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    return { ok: false as const, error: "Invoice not found" };
  }

  if (invoice.status === "PAID") {
    return { ok: false as const, error: "Cannot cancel a paid invoice" };
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: InvoiceStatus.CANCELLED },
  });

  return { ok: true as const, invoice: updated };
}

/**
 * Get completed appointments that don't have invoices yet (for the "Generate Invoice" list).
 * Receptionist/Admin only.
 */
export async function getBillableAppointments() {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN");

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "COMPLETED",
      invoices: { none: {} },
    },
    include: {
      patient: {
        select: { mrn: true, firstName: true, lastName: true },
      },
      doctor: {
        include: {
          department: { select: { name: true } },
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  return { ok: true as const, appointments };
}

/**
 * Set isInternal flag on a lab test order.
 * Receptionist/Admin only.
 */
export async function setLabOrderInternal(labTestOrderId: string, isInternal: boolean) {
  const session = await auth();
  requireRole(session, "RECEPTIONIST", "ADMIN");

  const order = await prisma.labTestOrder.findUnique({
    where: { id: labTestOrderId },
  });

  if (!order) {
    return { ok: false as const, error: "Lab test order not found" };
  }

  const updated = await prisma.labTestOrder.update({
    where: { id: labTestOrderId },
    data: { isInternal },
  });

  return { ok: true as const, order: updated };
}
