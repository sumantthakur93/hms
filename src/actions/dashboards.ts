"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { UserRole } from "@/types/next-auth";

// ─── Authorization ─────────────────────────────────────────────────────────────

function requireRole(
  session: {
    user: {
      role: UserRole;
      id: string;
      profileId?: string;
      patientId?: string;
    };
  } | null,
  ...roles: UserRole[]
) {
  if (!session?.user?.role || !roles.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// ─── Admin Dashboard ───────────────────────────────────────────────────────────

export async function getAdminDashboardData() {
  const session = await auth();
  requireRole(session, "ADMIN");

  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setHours(1, 0, 0, 0);

  const [
    totalPatients,
    todaysAppointments,
    activeDoctors,
    pendingInvoices,
    todaysPaidInvoices,
    monthlyPaidInvoices,
    recentAppointments,
    lowStockMedicines,
    departmentBreakdown,
    recentInvoices,
  ] = await Promise.all([
    prisma.patient.count(),

    prisma.appointment.count({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        status: { not: "CANCELLED" },
      },
    }),

    prisma.doctorProfile.count(),

    prisma.invoice.count({
      where: { status: { in: ["DRAFT", "ISSUED"] } },
    }),

    prisma.invoice.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: todayStart, lte: todayEnd },
      },
      select: { totalAmount: true },
    }),

    prisma.invoice.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: sixMonthsAgo },
      },
      select: { totalAmount: true, paidAt: true },
    }),

    prisma.appointment.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        doctor: {
          include: {
            user: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    }),

    prisma.medicine.findMany({
      where: { active: true },
      include: {
        batches: { select: { expiryDate: true, quantity: true } },
      },
    }),

    prisma.appointment.groupBy({
      by: ["doctorId"],
      _count: true,
    }),

    prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
      },
    }),
  ]);

  // Calculate low stock
  const todayNow = new Date();
  const lowStock = lowStockMedicines
    .map((med) => {
      const totalStock = med.batches
        .filter((b) => new Date(b.expiryDate) > todayNow)
        .reduce((sum, b) => sum + b.quantity, 0);
      return {
        id: med.id,
        name: med.name,
        totalStock,
        reorderLevel: med.reorderLevel,
      };
    })
    .filter((m) => m.totalStock <= m.reorderLevel);

  // Today's revenue
  const todayRevenue = todaysPaidInvoices.reduce(
    (sum, inv) => sum + inv.totalAmount,
    0,
  );

  // Monthly revenue trend (last 6 months)
  const monthlyMap: Record<string, number> = {};
  for (const inv of monthlyPaidInvoices) {
    if (inv.paidAt) {
      const key = `${inv.paidAt.getFullYear()}-${String(inv.paidAt.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = (monthlyMap[key] ?? 0) + inv.totalAmount;
    }
  }
  const monthlyRevenue: Array<{ month: string; amount: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { month: "short" });
    monthlyRevenue.push({ month: label, amount: monthlyMap[key] ?? 0 });
  }

  // Department breakdown — need to fetch doctor → department mapping
  const doctorIds = departmentBreakdown.map((d) => d.doctorId);
  const doctors = await prisma.doctorProfile.findMany({
    where: { id: { in: doctorIds } },
    include: { department: { select: { name: true } } },
  });

  const deptMap: Record<string, number> = {};
  for (const item of departmentBreakdown) {
    const doctor = doctors.find((d) => d.id === item.doctorId);
    const deptName = doctor?.department.name ?? "Unknown";
    deptMap[deptName] = (deptMap[deptName] ?? 0) + item._count;
  }

  const departments = Object.entries(deptMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    ok: true as const,
    stats: {
      totalPatients,
      todaysAppointments,
      activeDoctors,
      pendingInvoices,
      todayRevenue,
    },
    monthlyRevenue,
    recentAppointments: recentAppointments.map((a) => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      status: a.status,
      patientName: `${a.patient.firstName} ${a.patient.lastName}`,
      mrn: a.patient.mrn,
      doctorName: a.doctor.user.name ?? "—",
      department: a.doctor.department.name,
    })),
    lowStock,
    departments,
    recentInvoices: recentInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      totalAmount: inv.totalAmount,
      createdAt: inv.createdAt,
      patientName: `${inv.patient.firstName} ${inv.patient.lastName}`,
    })),
  };
}

// ─── Doctor Dashboard ──────────────────────────────────────────────────────────

export async function getDoctorDashboardData() {
  const session = await auth();
  const user = requireRole(session, "DOCTOR");

  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const doctorId = user.profileId!;

  const [
    todaysAppointmentsCount,
    patientsSeenToday,
    pendingLabResults,
    todaysAppointments,
    upcomingAppointments,
    recentPatients,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        doctorId,
        date: { gte: todayStart, lte: todayEnd },
        status: { not: "CANCELLED" },
      },
    }),

    prisma.consultation.count({
      where: {
        doctorId,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),

    prisma.labTestOrder.count({
      where: {
        isInternal: true,
        status: { in: ["ORDERED", "PROCESSING"] },
        consultation: { doctorId },
      },
    }),

    prisma.appointment.findMany({
      where: {
        doctorId,
        date: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { startTime: "asc" },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, mrn: true },
        },
      },
    }),

    prisma.appointment.findMany({
      where: {
        doctorId,
        date: { gt: todayEnd },
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
      take: 5,
      orderBy: { date: "asc" },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
      },
    }),

    prisma.patient.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: { id: true, firstName: true, lastName: true, mrn: true },
    }),
  ]);

  return {
    ok: true as const,
    stats: {
      todaysAppointments: todaysAppointmentsCount,
      patientsSeenToday,
      pendingLabResults,
    },
    todaysAppointments: todaysAppointments.map((a) => ({
      id: a.id,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      patientName: `${a.patient.firstName} ${a.patient.lastName}`,
      mrn: a.patient.mrn,
      patientId: a.patient.id,
    })),
    upcomingAppointments: upcomingAppointments.map((a) => ({
      id: a.id,
      date: a.date,
      startTime: a.startTime,
      patientName: `${a.patient.firstName} ${a.patient.lastName}`,
      mrn: a.patient.mrn,
    })),
    recentPatients: recentPatients.map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      mrn: p.mrn,
    })),
  };
}

// ─── Patient Dashboard ─────────────────────────────────────────────────────────

export async function getPatientDashboardData() {
  const session = await auth();
  const user = requireRole(session, "PATIENT");

  const patientId = user.patientId!;

  const [
    nextAppointment,
    activePrescriptions,
    pendingLabResults,
    recentAppointments,
    recentPrescriptions,
    recentLabResults,
  ] = await Promise.all([
    prisma.appointment.findFirst({
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
    }),

    prisma.prescription.count({
      where: {
        consultation: { appointment: { patientId } },
        items: { some: { dispensed: false } },
      },
    }),

    prisma.labTestOrder.count({
      where: {
        consultation: { appointment: { patientId } },
        status: { in: ["ORDERED", "PROCESSING"] },
        isInternal: true,
      },
    }),

    prisma.appointment.findMany({
      where: { patientId },
      take: 5,
      orderBy: { date: "desc" },
      include: {
        doctor: {
          include: {
            user: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    }),

    prisma.prescription.findMany({
      where: { consultation: { appointment: { patientId } } },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { medicine: { select: { name: true } } } },
      },
    }),

    prisma.labTestOrder.findMany({
      where: {
        consultation: { appointment: { patientId } },
        isInternal: true,
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        testType: { select: { name: true, code: true } },
      },
    }),
  ]);

  // Build activity timeline
  const activities: Array<{
    type: "APPOINTMENT" | "PRESCRIPTION" | "LAB_RESULT";
    date: Date;
    title: string;
    subtitle: string;
  }> = [];

  for (const a of recentAppointments) {
    activities.push({
      type: "APPOINTMENT",
      date: a.date,
      title: `Appointment with Dr. ${a.doctor.user.name ?? "—"}`,
      subtitle: a.doctor.department.name,
    });
  }

  for (const p of recentPrescriptions) {
    const medNames = p.items
      .map((i) => i.medicine.name)
      .slice(0, 3)
      .join(", ");
    activities.push({
      type: "PRESCRIPTION",
      date: p.createdAt,
      title: "Prescription",
      subtitle: medNames || "—",
    });
  }

  for (const l of recentLabResults) {
    activities.push({
      type: "LAB_RESULT",
      date: l.createdAt,
      title: `Lab Test: ${l.testType.name}`,
      subtitle: l.status,
    });
  }

  activities.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return {
    ok: true as const,
    patientName: session?.user?.name ?? "Patient",
    nextAppointment: nextAppointment
      ? {
          id: nextAppointment.id,
          date: nextAppointment.date,
          startTime: nextAppointment.startTime,
          doctorName: nextAppointment.doctor.user.name ?? "—",
          department: nextAppointment.doctor.department.name,
        }
      : null,
    stats: {
      activePrescriptions,
      pendingLabResults,
    },
    activities: activities.slice(0, 5),
  };
}

// ─── Receptionist Dashboard ────────────────────────────────────────────────────

export async function getReceptionistDashboardData() {
  const session = await auth();
  requireRole(session, "RECEPTIONIST");

  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const [
    todaysTotal,
    checkedIn,
    waiting,
    completed,
    todaysAppointments,
    recentInvoices,
  ] = await Promise.all([
    prisma.appointment.count({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        status: { not: "CANCELLED" },
      },
    }),

    prisma.appointment.count({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        status: "CHECKED_IN",
      },
    }),

    prisma.appointment.count({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        status: "CONFIRMED",
      },
    }),

    prisma.appointment.count({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        status: "COMPLETED",
      },
    }),

    prisma.appointment.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { startTime: "asc" },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
        doctor: {
          include: {
            user: { select: { name: true } },
            department: { select: { name: true } },
          },
        },
      },
    }),

    prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        patient: { select: { firstName: true, lastName: true, mrn: true } },
      },
    }),
  ]);

  return {
    ok: true as const,
    stats: {
      todaysTotal,
      checkedIn,
      waiting,
      completed,
    },
    todaysAppointments: todaysAppointments.map((a) => ({
      id: a.id,
      startTime: a.startTime,
      status: a.status,
      patientName: `${a.patient.firstName} ${a.patient.lastName}`,
      mrn: a.patient.mrn,
      doctorName: a.doctor.user.name ?? "—",
      department: a.doctor.department.name,
    })),
    recentInvoices: recentInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      totalAmount: inv.totalAmount,
      createdAt: inv.createdAt,
      patientName: `${inv.patient.firstName} ${inv.patient.lastName}`,
    })),
  };
}

// ─── Lab Technician Dashboard ──────────────────────────────────────────────────

export async function getLabDashboardData() {
  const session = await auth();
  requireRole(session, "LAB_TECHNICIAN");

  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const [pendingTests, inProgress, completedToday, testQueue] =
    await Promise.all([
      prisma.labTestOrder.count({
        where: { isInternal: true, status: "ORDERED" },
      }),

      prisma.labTestOrder.count({
        where: { isInternal: true, status: "PROCESSING" },
      }),

      prisma.labTestOrder.count({
        where: {
          isInternal: true,
          status: "COMPLETED",
          updatedAt: { gte: todayStart, lte: todayEnd },
        },
      }),

      prisma.labTestOrder.findMany({
        where: {
          isInternal: true,
          status: { in: ["ORDERED", "PROCESSING"] },
        },
        take: 10,
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        include: {
          testType: { select: { name: true, code: true } },
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
      }),
    ]);

  return {
    ok: true as const,
    stats: {
      pendingTests,
      inProgress,
      completedToday,
    },
    testQueue: testQueue.map((o) => ({
      id: o.id,
      status: o.status,
      priority: o.priority,
      createdAt: o.createdAt,
      testName: o.testType.name,
      testCode: o.testType.code,
      patientName: o.consultation?.appointment?.patient
        ? `${o.consultation.appointment.patient.firstName} ${o.consultation.appointment.patient.lastName}`
        : "—",
      mrn: o.consultation?.appointment?.patient?.mrn ?? "—",
    })),
  };
}
