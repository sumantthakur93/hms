"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Stethoscope, Clock } from "@/components/ui/icon";
import { getDoctorAppointments } from "@/actions/consultations";

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  reason: string | null;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    phone: string;
    gender: string | null;
    dateOfBirth: Date | null;
  };
};

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "CHECKED_IN":
      return "default";
    case "IN_CONSULTATION":
      return "secondary";
    case "COMPLETED":
      return "outline";
    case "NO_SHOW":
      return "destructive";
    default:
      return "outline";
  }
}

export function DoctorAppointments() {
  const router = useRouter();
  const [loading, startLoad] = useTransition();
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    startLoad(async () => {
      const result = await getDoctorAppointments();
      if (result.ok) {
        setAppointments(result.appointments as Appointment[]);
      }
    });
  }, []);

  function calcAge(dob: Date | null): string {
    if (!dob) return "—";
    const age = new Date().getFullYear() - new Date(dob).getFullYear();
    return `${age}y`;
  }

  if (loading && appointments.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading appointments…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Today&apos;s Appointments
          </h1>
          <p className="text-sm text-muted-foreground">
            {appointments.length} appointment
            {appointments.length !== 1 ? "s" : ""} scheduled
          </p>
        </div>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Stethoscope className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No appointments for today
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 flex-col items-center justify-center rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                    <Clock className="size-3" />
                    <span className="mt-0.5">{appt.startTime}</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {appt.patient.firstName} {appt.patient.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      MRN: {appt.patient.mrn} ·{" "}
                      {calcAge(appt.patient.dateOfBirth)} ·{" "}
                      {appt.patient.gender ?? "—"}
                    </p>
                    {appt.reason && (
                      <p className="text-xs text-muted-foreground">
                        {appt.reason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusBadgeVariant(appt.status)}>
                    {appt.status.replace(/_/g, " ")}
                  </Badge>
                  {(appt.status === "CHECKED_IN" ||
                    appt.status === "IN_CONSULTATION" ||
                    appt.status === "COMPLETED") && (
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(`/doctor/consultation/${appt.id}`)
                      }
                    >
                      <Stethoscope className="size-4" />
                      {appt.status === "CHECKED_IN"
                        ? "Start Consultation"
                        : appt.status === "IN_CONSULTATION"
                          ? "Continue"
                          : "View"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
