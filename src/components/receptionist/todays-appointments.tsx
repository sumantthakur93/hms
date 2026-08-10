"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  UserX,
  Clock,
} from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";
import { checkInAppointment, markNoShow } from "@/actions/appointments";
import { cn } from "@/lib/utils";

type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  startTime: string;
  endTime: string;
  status: string;
  reason: string | null;
  patientName: string;
  mrn: string;
  phone: string;
  doctorName: string;
  departmentName: string;
};

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  CHECKED_IN: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  IN_CONSULTATION: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  COMPLETED: "bg-green-500/10 text-green-600 border-green-500/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  NO_SHOW: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function TodaysAppointments({
  appointments: initial,
}: {
  appointments: Appointment[];
}) {
  const router = useRouter();
  const [appointments, setAppointments] = useState(initial);
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const doctors = Array.from(
    new Map(appointments.map((a) => [a.doctorId, a.doctorName])).entries(),
  ).map(([id, name]) => ({ id, name }));

  const filtered = appointments.filter((a) => {
    if (doctorFilter !== "all" && a.doctorId !== doctorFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: appointments.length,
    checkedIn: appointments.filter((a) => a.status === "CHECKED_IN").length,
    waiting: appointments.filter((a) => a.status === "CHECKED_IN").length,
    completed: appointments.filter((a) => a.status === "COMPLETED").length,
  };

  function handleCheckIn(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await checkInAppointment(id);
      if (result.ok) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "CHECKED_IN" } : a)),
        );
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function handleNoShow(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await markNoShow(id);
      if (result.ok) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "NO_SHOW" } : a)),
        );
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
        <CalendarClock className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No appointments scheduled for today.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Today"
          value={stats.total}
          icon={CalendarClock}
        />
        <StatCard label="Checked In" value={stats.checkedIn} icon={UserCheck} />
        <StatCard label="Waiting" value={stats.waiting} icon={Clock} />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={doctorFilter}
          onValueChange={(v) => setDoctorFilter(v ?? "all")}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All doctors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All doctors</SelectItem>
            {doctors.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="CHECKED_IN">Checked In</SelectItem>
            <SelectItem value="IN_CONSULTATION">In Consultation</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="NO_SHOW">No Show</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Time
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Patient
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                MRN
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Doctor
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((apt) => (
              <tr key={apt.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium text-foreground">
                  {apt.startTime}
                  <span className="text-muted-foreground">
                    {" "}
                    – {apt.endTime}
                  </span>
                </td>
                <td className="px-4 py-3 text-foreground">{apt.patientName}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {apt.mrn}
                </td>
                <td className="px-4 py-3 text-foreground">{apt.doctorName}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                      STATUS_STYLES[apt.status] ?? STATUS_STYLES.CONFIRMED,
                    )}
                  >
                    {apt.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {apt.status === "CONFIRMED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => handleCheckIn(apt.id)}
                      >
                        <UserCheck className="size-3.5" />
                        Check In
                      </Button>
                    )}
                    {apt.status === "CHECKED_IN" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={pending}
                        onClick={() => handleNoShow(apt.id)}
                      >
                        <UserX className="size-3.5" />
                        No Show
                      </Button>
                    )}
                    {apt.status === "COMPLETED" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            router.push(`/receptionist/dispense/${apt.id}`)
                          }
                        >
                          Dispense
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push("/receptionist/billing")}
                        >
                          Generate Invoice
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No appointments match the selected filters.
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
