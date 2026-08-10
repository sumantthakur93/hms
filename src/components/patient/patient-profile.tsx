"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Activity,
  Pill,
  TestTube,
  CalendarClock,
  AlertCircle,
  Edit3,
} from "@/components/ui/icon";
import {
  appointmentStatusBadge,
  invoiceStatusBadge,
  labStatusBadge as sharedLabStatusBadge,
} from "@/components/ui/status-badges";
import { PatientEditForm } from "@/components/receptionist/patient-edit-form";
import type { UserRole } from "@/types/next-auth";

type ProfileData = {
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    dateOfBirth: Date | null;
    gender: string | null;
    bloodGroup: string | null;
    address: string | null;
    allergies: string | null;
    emergencyName: string | null;
    emergencyPhone: string | null;
    emergencyRelation: string | null;
    medicalHistory: string | null;
  };
  consultations: Array<{
    id: string;
    symptoms: string | null;
    diagnosis: string | null;
    notes: string | null;
    vitals: Record<string, string> | null;
    createdAt: Date;
    appointmentDate: Date;
    doctorName: string;
  }>;
  prescriptions: Array<{
    id: string;
    createdAt: Date;
    appointmentDate: Date;
    doctorName: string;
    items: Array<{
      id: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string | null;
      quantity: number;
      medicineName: string;
    }>;
  }>;
  labOrders: Array<{
    id: string;
    status: string;
    priority: string;
    createdAt: Date;
    testName: string;
    testCode: string;
    result: { results: Record<string, unknown>[]; notes: string | null } | null;
  }>;
  appointments: Array<{
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    status: string;
    doctorName: string;
    department: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    createdAt: Date;
  }>;
};

function calcAge(dob: Date | null): string {
  if (!dob) return "—";
  const age = new Date().getFullYear() - new Date(dob).getFullYear();
  return `${age}y`;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ─── Timeline entry types ──────────────────────────────────────────────────────

type TimelineEntry = {
  id: string;
  type: "consultation" | "prescription" | "lab" | "appointment";
  date: Date;
  title: string;
  subtitle: string;
};

function buildTimeline(data: ProfileData): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const c of data.consultations) {
    entries.push({
      id: c.id,
      type: "consultation",
      date: c.appointmentDate,
      title: c.diagnosis || "Consultation",
      subtitle: `Dr. ${c.doctorName}`,
    });
  }

  for (const p of data.prescriptions) {
    entries.push({
      id: p.id,
      type: "prescription",
      date: p.appointmentDate,
      title: `Prescription (${p.items.length} items)`,
      subtitle: `Dr. ${p.doctorName}`,
    });
  }

  for (const l of data.labOrders) {
    entries.push({
      id: l.id,
      type: "lab",
      date: l.createdAt,
      title: `Lab: ${l.testName}`,
      subtitle: l.status,
    });
  }

  for (const a of data.appointments) {
    entries.push({
      id: a.id,
      type: "appointment",
      date: a.date,
      title: `Appointment — Dr. ${a.doctorName}`,
      subtitle: a.department,
    });
  }

  return entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

const TYPE_COLORS: Record<TimelineEntry["type"], string> = {
  consultation: "#3b82f6",
  prescription: "#14b8a6",
  lab: "#6366f1",
  appointment: "#64748b",
};

const TYPE_ICONS: Record<
  TimelineEntry["type"],
  React.ComponentType<{ className?: string }>
> = {
  consultation: Activity,
  prescription: Pill,
  lab: TestTube,
  appointment: CalendarClock,
};

// ─── Main Component ────────────────────────────────────────────────────────────

export function PatientProfile({
  data,
  role,
}: {
  data: ProfileData;
  role: UserRole;
}) {
  const { patient } = data;
  const canEdit = role === "ADMIN" || role === "RECEPTIONIST";
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card/50 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {patient.firstName[0]}
              {patient.lastName[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {patient.mrn} · {calcAge(patient.dateOfBirth)} ·{" "}
                {patient.gender ?? "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                {patient.phone} · {patient.email ?? "No email"}
              </p>
            </div>
          </div>

          {canEdit && (
            <Sheet open={editOpen} onOpenChange={setEditOpen}>
              <SheetTrigger>
                <Button variant="outline" size="sm">
                  <Edit3 className="size-4" />
                  Edit
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Edit Patient</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <PatientEditForm
                    patient={patient}
                    onSaved={() => setEditOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Allergies */}
        {patient.allergies && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
            <AlertCircle className="size-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              Allergies: {patient.allergies}
            </span>
          </div>
        )}

        {/* Emergency contact */}
        {(patient.emergencyName || patient.emergencyPhone) && (
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="font-medium">Emergency:</span>
            <span>{patient.emergencyName ?? "—"}</span>
            <span>{patient.emergencyPhone ?? "—"}</span>
            {patient.emergencyRelation && (
              <span>({patient.emergencyRelation})</span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList className="w-full">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-2">
          <TimelineTab data={data} />
        </TabsContent>

        <TabsContent value="appointments" className="space-y-2">
          <AppointmentsTab data={data} />
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-2">
          <PrescriptionsTab data={data} />
        </TabsContent>

        <TabsContent value="labs" className="space-y-2">
          <LabResultsTab data={data} />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-2">
          <InvoicesTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Timeline Tab ──────────────────────────────────────────────────────────────

function TimelineTab({ data }: { data: ProfileData }) {
  const [filter, setFilter] = useState<"all" | TimelineEntry["type"]>("all");
  const timeline = buildTimeline(data);
  const filtered =
    filter === "all" ? timeline : timeline.filter((e) => e.type === filter);

  const filters: Array<{
    label: string;
    value: "all" | TimelineEntry["type"];
  }> = [
    { label: "All", value: "all" },
    { label: "Consultations", value: "consultation" },
    { label: "Prescriptions", value: "prescription" },
    { label: "Lab Results", value: "lab" },
    { label: "Appointments", value: "appointment" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <Button
            key={f.value}
            onClick={() => setFilter(f.value)}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            className="rounded-full px-3 py-1 text-xs"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No activity yet
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const Icon = TYPE_ICONS[entry.type];
            const color = TYPE_COLORS[entry.type];
            return (
              <div
                key={`${entry.type}-${entry.id}`}
                className="rounded-lg border border-border bg-card p-3"
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <div className="flex items-center gap-3">
                  <div style={{ color }}>
                    <Icon className="size-4 shrink-0" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {entry.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(entry.date)} · {entry.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Appointments Tab ──────────────────────────────────────────────────────────

function AppointmentsTab({ data }: { data: ProfileData }) {
  if (data.appointments.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No appointments
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-2 text-left font-medium">Date</th>
            <th className="py-2 text-left font-medium">Time</th>
            <th className="py-2 text-left font-medium">Doctor</th>
            <th className="py-2 text-left font-medium">Department</th>
            <th className="py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.appointments.map((a) => (
            <tr key={a.id} className="border-b border-border/50">
              <td className="py-3 pr-2 text-foreground">
                {formatDate(a.date)}
              </td>
              <td className="py-3 pr-2 text-muted-foreground">
                {formatTime(a.startTime)}
              </td>
              <td className="py-3 pr-2 text-foreground">{a.doctorName}</td>
              <td className="py-3 pr-2 text-muted-foreground">
                {a.department}
              </td>
              <td className="py-3 pr-2">{appointmentStatusBadge(a.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Prescriptions Tab ─────────────────────────────────────────────────────────

function PrescriptionsTab({ data }: { data: ProfileData }) {
  if (data.prescriptions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No prescriptions
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.prescriptions.map((p) => (
        <PrescriptionExpandable key={p.id} prescription={p} />
      ))}
    </div>
  );
}

function PrescriptionExpandable({
  prescription,
}: {
  prescription: ProfileData["prescriptions"][number];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div
        onClick={() => setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpanded((p) => !p);
        }}
        className="flex w-full cursor-pointer items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-medium text-foreground">
            {formatDate(prescription.appointmentDate)} ·{" "}
            {prescription.items.length} item
            {prescription.items.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            By {prescription.doctorName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              window.open(
                `/api/prescriptions/${prescription.id}/pdf`,
                "_blank",
              );
            }}
            aria-label="Download PDF"
          >
            <Download className="size-4" />
          </Button>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 space-y-1 border-t border-border pt-3">
          {prescription.items.map((item) => (
            <div key={item.id} className="text-sm">
              <span className="font-medium text-foreground">
                {item.medicineName}
              </span>
              <span className="text-muted-foreground">
                {" "}
                — {item.dosage}, {item.frequency}, {item.duration}
              </span>
              {item.instructions && (
                <span className="text-xs text-muted-foreground">
                  {" "}
                  ({item.instructions})
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Lab Results Tab ───────────────────────────────────────────────────────────

function LabResultsTab({ data }: { data: ProfileData }) {
  if (data.labOrders.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No lab results
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.labOrders.map((l) => (
        <LabOrderExpandable key={l.id} labOrder={l} />
      ))}
    </div>
  );
}

function LabOrderExpandable({
  labOrder,
}: {
  labOrder: ProfileData["labOrders"][number];
}) {
  const [expanded, setExpanded] = useState(false);
  const results = labOrder.result?.results as Array<{
    parameter: string;
    value: string;
    unit: string;
    referenceRange: string;
  }> | null;

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div
        onClick={() => setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpanded((p) => !p);
        }}
        className="flex w-full cursor-pointer items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-medium text-foreground">
            {labOrder.testName} ({labOrder.testCode})
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(labOrder.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sharedLabStatusBadge(labOrder.status)}
          {labOrder.priority === "URGENT" && (
            <Badge variant="destructive">Urgent</Badge>
          )}
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          {results && results.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="py-1 text-left">Parameter</th>
                  <th className="py-1 text-left">Value</th>
                  <th className="py-1 text-left">Unit</th>
                  <th className="py-1 text-left">Ref Range</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="py-1">{r.parameter}</td>
                    <td className="py-1 font-medium">{r.value}</td>
                    <td className="py-1">{r.unit}</td>
                    <td className="py-1 text-muted-foreground">
                      {r.referenceRange}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              {labOrder.result?.notes || "Results pending"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Invoices Tab ──────────────────────────────────────────────────────────────

function InvoicesTab({ data }: { data: ProfileData }) {
  if (data.invoices.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No invoices
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="py-2 text-left font-medium">Invoice #</th>
            <th className="py-2 text-left font-medium">Date</th>
            <th className="py-2 text-left font-medium">Amount</th>
            <th className="py-2 text-left font-medium">Status</th>
            <th className="py-2 text-right font-medium">PDF</th>
          </tr>
        </thead>
        <tbody>
          {data.invoices.map((inv) => (
            <tr key={inv.id} className="border-b border-border/50">
              <td className="py-3 pr-2 font-medium text-foreground">
                {inv.invoiceNumber}
              </td>
              <td className="py-3 pr-2 text-muted-foreground">
                {formatDate(inv.createdAt)}
              </td>
              <td className="py-3 pr-2 text-foreground">
                ₹{inv.totalAmount.toFixed(2)}
              </td>
              <td className="py-3 pr-2">{invoiceStatusBadge(inv.status)}</td>
              <td className="py-3 text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    window.open(`/api/invoices/${inv.id}/pdf`, "_blank")
                  }
                  aria-label="Download PDF"
                >
                  <Download className="size-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
