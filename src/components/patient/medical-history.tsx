"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Pill,
  TestTube,
  CalendarClock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "@/components/ui/icon";

type HistoryData = {
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
    allergies: string | null;
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
};

type TimelineEntry = {
  id: string;
  type: "consultation" | "prescription" | "lab" | "appointment";
  date: Date;
  title: string;
  subtitle: string;
  details?: React.ReactNode;
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

function buildTimeline(data: HistoryData): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const c of data.consultations) {
    entries.push({
      id: c.id,
      type: "consultation",
      date: c.appointmentDate,
      title: c.diagnosis || "Consultation",
      subtitle: `Dr. ${c.doctorName}`,
      details: (
        <div className="space-y-1 text-xs">
          {c.symptoms && (
            <p><span className="text-muted-foreground">Symptoms:</span> {c.symptoms}</p>
          )}
          {c.diagnosis && (
            <p><span className="text-muted-foreground">Diagnosis:</span> {c.diagnosis}</p>
          )}
          {c.notes && (
            <p><span className="text-muted-foreground">Notes:</span> {c.notes}</p>
          )}
          {c.vitals && (
            <div className="mt-1 flex flex-wrap gap-2">
              {Object.entries(c.vitals).map(([k, v]) =>
                v ? <span key={k} className="rounded bg-muted px-1.5 py-0.5">{k}: {v}</span> : null,
              )}
            </div>
          )}
        </div>
      ),
    });
  }

  for (const p of data.prescriptions) {
    entries.push({
      id: p.id,
      type: "prescription",
      date: p.appointmentDate,
      title: `Prescription (${p.items.length} items)`,
      subtitle: `Dr. ${p.doctorName}`,
      details: (
        <div className="space-y-1 text-xs">
          {p.items.map((item) => (
            <div key={item.id}>
              <span className="font-medium text-foreground">{item.medicineName}</span>
              <span className="text-muted-foreground"> — {item.dosage}, {item.frequency}, {item.duration}</span>
              {item.instructions && (
                <span className="text-muted-foreground"> ({item.instructions})</span>
              )}
            </div>
          ))}
        </div>
      ),
    });
  }

  for (const l of data.labOrders) {
    entries.push({
      id: l.id,
      type: "lab",
      date: l.createdAt,
      title: `Lab: ${l.testName}`,
      subtitle: l.status,
      details: l.result?.notes ? (
        <p className="text-xs text-muted-foreground">{l.result.notes}</p>
      ) : undefined,
    });
  }

  for (const a of data.appointments) {
    entries.push({
      id: a.id,
      type: "appointment",
      date: a.date,
      title: `Appointment — Dr. ${a.doctorName}`,
      subtitle: `${a.department} · ${formatTime(a.startTime)} · ${a.status}`,
    });
  }

  return entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

function TimelineEntryCard({ entry }: { entry: TimelineEntry }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TYPE_ICONS[entry.type];
  const color = TYPE_COLORS[entry.type];

  return (
    <div
      className="rounded-lg border border-border bg-card p-3"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div
        onClick={() => entry.details && setExpanded((e) => !e)}
        role={entry.details ? "button" : undefined}
        tabIndex={entry.details ? 0 : undefined}
        onKeyDown={(e) => {
          if (entry.details && (e.key === "Enter" || e.key === " ")) setExpanded((p) => !p);
        }}
        className={`flex items-center gap-3 ${entry.details ? "cursor-pointer" : ""}`}
      >
        <div style={{ color }}>
          <Icon className="size-4 shrink-0" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{entry.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(entry.date)} · {entry.subtitle}
          </p>
        </div>
        {entry.details && (
          expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )
        )}
      </div>
      {expanded && entry.details && (
        <div className="mt-2 border-t border-border pt-2">{entry.details}</div>
      )}
    </div>
  );
}

export function MedicalHistory({ data }: { data: HistoryData }) {
  const [filter, setFilter] = useState<"all" | TimelineEntry["type"]>("all");
  const timeline = buildTimeline(data);
  const filtered =
    filter === "all" ? timeline : timeline.filter((e) => e.type === filter);

  const filters: Array<{ label: string; value: "all" | TimelineEntry["type"] }> = [
    { label: "All", value: "all" },
    { label: "Consultations", value: "consultation" },
    { label: "Prescriptions", value: "prescription" },
    { label: "Lab Results", value: "lab" },
    { label: "Appointments", value: "appointment" },
  ];

  const { patient } = data;

  return (
    <div className="space-y-6">
      {/* Patient header */}
      <div className="rounded-xl border border-border bg-card/50 p-5">
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
              {patient.bloodGroup && ` · ${patient.bloodGroup}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {patient.phone} · {patient.email ?? "No email"}
            </p>
          </div>
        </div>

        {patient.allergies && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
            <AlertCircle className="size-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              Allergies: {patient.allergies}
            </span>
          </div>
        )}

        {patient.medicalHistory && (
          <div className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium">Medical History:</span>{" "}
            {patient.medicalHistory}
          </div>
        )}
      </div>

      {/* Filter buttons */}
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

      {/* Timeline */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No medical history yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <TimelineEntryCard
              key={`${entry.type}-${entry.id}`}
              entry={entry}
            />
          ))}
        </div>
      )}
    </div>
  );
}
