"use client";

import { useState, useTransition } from "react";
import {
  CalendarClock,
  Loader2,
  AlertCircle,
  Calendar,
  X,
  ArrowRight,
} from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  computeSlots,
  rescheduleAppointment,
  cancelAppointment,
  type Slot,
} from "@/actions/appointments";
import { cn } from "@/lib/utils";

type Appointment = {
  id: string;
  doctorId: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  reason: string | null;
  originalDate: Date | null;
  originalTime: string | null;
  doctorName: string;
  departmentName: string;
  consultationFee: number;
};

export function AppointmentList({
  appointments: initial,
}: {
  appointments: Appointment[];
}) {
  const [appointments, setAppointments] = useState(initial);
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canceling, startCancel] = useTransition();

  function handleCancel(id: string) {
    setError(null);
    startCancel(async () => {
      const result = await cancelAppointment(id);
      if (result.ok) {
        setAppointments((prev) => prev.filter((a) => a.id !== id));
      } else {
        setError(result.error);
      }
    });
  }

  function onRescheduled(id: string) {
    setRescheduling(null);
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  }

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
        <CalendarClock className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No upcoming appointments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {appointments.map((apt) => {
        if (rescheduling === apt.id) {
          return (
            <RescheduleForm
              key={apt.id}
              appointment={apt}
              onCancel={() => setRescheduling(null)}
              onDone={() => onRescheduled(apt.id)}
            />
          );
        }

        return (
          <Card key={apt.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10">
                <span className="text-xs font-medium text-muted-foreground">
                  {new Date(apt.date).toLocaleDateString("en-IN", {
                    month: "short",
                  })}
                </span>
                <span className="text-lg font-bold text-primary">
                  {new Date(apt.date).getDate()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{apt.doctorName}</p>
                <p className="text-sm text-muted-foreground">
                  {apt.departmentName}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarClock className="size-3" />
                    {apt.startTime} – {apt.endTime}
                  </span>
                  {apt.originalDate && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <ArrowRight className="size-3" />
                      Rescheduled from{" "}
                      {new Date(apt.originalDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })}{" "}
                      {apt.originalTime}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRescheduling(apt.id);
                    setError(null);
                  }}
                >
                  Reschedule
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={canceling}
                  onClick={() => handleCancel(apt.id)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function RescheduleForm({
  appointment,
  onCancel,
  onDone,
}: {
  appointment: Appointment;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, startLoading] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDateSelect(d: Date) {
    setDate(d);
    setSelectedSlot(null);
    setSlots([]);
    const iso = d.toISOString().split("T")[0];
    startLoading(async () => {
      const result = await computeSlots(appointment.doctorId, iso);
      if (result.ok) {
        setSlots(result.slots);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSubmit() {
    if (!date || !selectedSlot) return;
    const iso = date.toISOString().split("T")[0];
    setError(null);
    startSubmit(async () => {
      const result = await rescheduleAppointment({
        appointmentId: appointment.id,
        newDate: iso,
        newStartTime: selectedSlot.startTime,
        newEndTime: selectedSlot.endTime,
      });
      if (result.ok) {
        onDone();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card className="border-primary/30">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">
            Reschedule Appointment
          </h3>
          <Button size="icon" variant="ghost" onClick={onCancel}>
            <X className="size-4" />
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              New date
            </p>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="w-full justify-start sm:w-56"
                  />
                }
              >
                <Calendar className="size-4 text-muted-foreground" />
                {date
                  ? date.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Pick a date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={date ?? undefined}
                  onSelect={(d) => d && handleDateSelect(d)}
                  disabled={(d) =>
                    d < new Date(new Date().setHours(0, 0, 0, 0)) ||
                    d > new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                  }
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Available slots
            </p>
            {!date && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Select a date first.
              </p>
            )}
            {date && loading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            )}
            {date && !loading && slots.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No slots available.
              </p>
            )}
            {date && !loading && slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <button
                    key={slot.startTime}
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-sm font-medium transition-all",
                      !slot.available
                        ? "cursor-not-allowed border-border bg-muted/50 text-muted-foreground/50"
                        : selectedSlot?.startTime === slot.startTime
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50",
                    )}
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedSlot || submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Rescheduling...
              </>
            ) : (
              "Confirm Reschedule"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
