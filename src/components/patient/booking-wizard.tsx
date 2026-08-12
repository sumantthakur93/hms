"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Stethoscope,
  Calendar,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDepartmentsForBooking,
  getDoctorsByDepartment,
  computeSlots,
  bookAppointment,
  type Slot,
} from "@/actions/appointments";
import { cn } from "@/lib/utils";

type Department = {
  id: string;
  name: string;
  description: string | null;
  consultationFee: number;
  doctorCount: number;
};

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  departmentName: string;
  consultationFee: number;
  scheduleBlocks: { dayOfWeek: number }[];
  blockedDates: { date: Date }[];
};

export function BookingWizard({
  receptionistPatientId,
}: {
  receptionistPatientId?: string;
} = {}) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [loading, startLoading] = useTransition();
  const [booking, startBooking] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    doctorName: string;
    departmentName: string;
    date: string;
    time: string;
    fee: number;
  } | null>(null);

  // Load departments on mount
  useEffect(() => {
    startLoading(async () => {
      const result = await getDepartmentsForBooking();
      if (result.ok) {
        setDepartments(result.departments);
      } else {
        setError(result.error);
      }
    });
  }, []);

  // Load doctors when department selected
  function handleSelectDepartment(deptId: string | null) {
    if (!deptId) return;
    setError(null);
    setSelectedDept(deptId);
    setDoctors([]);
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots([]);
    startLoading(async () => {
      const result = await getDoctorsByDepartment(deptId);
      if (result.ok) {
        setDoctors(result.doctors);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSelectDoctor(doctorId: string | null) {
    if (!doctorId) return;
    const doctor = doctors.find((d) => d.id === doctorId) ?? null;
    setError(null);
    setSelectedDoctor(doctor);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots([]);
  }

  function handleSelectDate(date: Date) {
    if (!selectedDoctor) return;
    setError(null);
    setSelectedDate(date);
    setSelectedSlot(null);
    const iso = formatLocalDate(date);
    startLoading(async () => {
      const result = await computeSlots(selectedDoctor.id, iso);
      if (result.ok) {
        setSlots(result.slots);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;
    const iso = formatLocalDate(selectedDate);
    setError(null);
    startBooking(async () => {
      const result = await bookAppointment({
        doctorId: selectedDoctor.id,
        date: iso,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        patientId: receptionistPatientId,
      });
      if (result.ok) {
        setSuccess({
          doctorName: selectedDoctor.name,
          departmentName: selectedDoctor.departmentName,
          date: selectedDate.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          time: `${selectedSlot.startTime} – ${selectedSlot.endTime}`,
          fee: selectedDoctor.consultationFee,
        });
      } else {
        setError(result.error);
      }
    });
  }

  function reset() {
    setSelectedDept(null);
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setDoctors([]);
    setSlots([]);
    setError(null);
    setSuccess(null);
  }

  const readyToBook = Boolean(
    selectedDoctor && selectedDate && selectedSlot && !booking,
  );

  // Success state
  if (success) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="size-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Appointment Booked!
          </h2>
          <p className="text-sm text-muted-foreground">
            Your appointment has been confirmed.
          </p>
          <div className="w-full space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-left">
            <Row label="Doctor" value={success.doctorName} />
            <Row label="Department" value={success.departmentName} />
            <Row label="Date" value={success.date} />
            <Row label="Time" value={success.time} />
            <Row label="Consultation Fee" value={`₹${success.fee}`} />
          </div>
          <Button onClick={reset} className="w-full">
            Done
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Department */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Department
          </label>
          <Select
            value={selectedDept ?? null}
            onValueChange={handleSelectDepartment}
            disabled={loading && departments.length === 0}
            items={departments.map((d) => ({
              value: d.id,
              label: `${d.name} · ₹${d.consultationFee}`,
            }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  loading && departments.length === 0
                    ? "Loading..."
                    : "Select department"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name} · ₹{dept.consultationFee}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDept && (
            <p className="text-xs text-muted-foreground">
              {departments.find((d) => d.id === selectedDept)?.doctorCount}{" "}
              doctor
              {(departments.find((d) => d.id === selectedDept)?.doctorCount ??
                0) !== 1
                ? "s"
                : ""}{" "}
              available
            </p>
          )}
        </div>

        {/* Doctor */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Doctor</label>
          <Select
            value={selectedDoctor?.id ?? null}
            onValueChange={handleSelectDoctor}
            disabled={!selectedDept || (loading && doctors.length === 0)}
            items={doctors.map((d) => ({
              value: d.id,
              label: `${d.name} · ${d.specialization}`,
            }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  !selectedDept
                    ? "Select department first"
                    : loading && doctors.length === 0
                      ? "Loading..."
                      : doctors.length === 0
                        ? "No doctors available"
                        : "Select doctor"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {doctors.map((doc) => (
                <SelectItem key={doc.id} value={doc.id}>
                  {doc.name} · {doc.specialization}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDoctor && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Stethoscope className="size-3" />
              Next available:{" "}
              {getNextAvailableDay(
                selectedDoctor.scheduleBlocks.map((b) => b.dayOfWeek),
              )}
            </p>
          )}
        </div>
      </div>

      {/* Date & Slot */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Date</label>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="w-full justify-start sm:w-56"
                  disabled={!selectedDoctor}
                />
              }
            >
              <Calendar className="size-4 text-muted-foreground" />
              {selectedDate
                ? selectedDate.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "Pick a date"}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate ?? undefined}
                onSelect={(d) => d && handleSelectDate(d)}
                disabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                  date > new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) ||
                  !selectedDoctor ||
                  isDateBlocked(date, selectedDoctor.blockedDates) ||
                  !selectedDoctor.scheduleBlocks.some(
                    (b) => b.dayOfWeek === date.getDay(),
                  )
                }
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Available slots
          </label>
          {!selectedDate && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {selectedDoctor
                ? "Select a date to see available slots."
                : "Select a doctor first."}
            </p>
          )}
          {selectedDate && loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          )}
          {selectedDate && !loading && slots.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No slots available for this date.
            </p>
          )}
          {selectedDate && !loading && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <Button
                  key={slot.startTime}
                  type="button"
                  disabled={!slot.available}
                  variant={
                    selectedSlot?.startTime === slot.startTime
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    !slot.available && "cursor-not-allowed opacity-50",
                  )}
                >
                  {slot.startTime}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary + submit */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Appointment Summary
          </h2>
          <Row
            label="Department"
            value={selectedDoctor?.departmentName ?? "—"}
          />
          <Row label="Doctor" value={selectedDoctor?.name ?? "—"} />
          <Row
            label="Date"
            value={
              selectedDate
                ? selectedDate.toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "—"
            }
          />
          <Row
            label="Time"
            value={
              selectedSlot
                ? `${selectedSlot.startTime} – ${selectedSlot.endTime}`
                : "—"
            }
          />
          <div className="border-t border-border pt-3">
            <Row
              label="Consultation Fee"
              value={
                selectedDoctor ? `₹${selectedDoctor.consultationFee}` : "—"
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={!readyToBook}>
          {booking ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Booking...
            </>
          ) : (
            <>
              <CalendarPlus className="size-4" />
              Book Appointment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function getNextAvailableDay(availableDays: number[]): string {
  if (availableDays.length === 0) return "No schedule";
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    if (availableDays.includes(d.getDay())) {
      if (i === 0) return "Today";
      if (i === 1) return "Tomorrow";
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });
    }
  }
  return "No availability";
}

function isDateBlocked(date: Date, blockedDates: { date: Date }[]): boolean {
  const dateStr = date.toDateString();
  return blockedDates.some(
    (bd) => new Date(bd.date).toDateString() === dateStr,
  );
}

/**
 * Format a Date as YYYY-MM-DD using local date components.
 * Avoids toISOString() which shifts the date back by one day
 * in timezones behind UTC (e.g. IST +5:30).
 */
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
