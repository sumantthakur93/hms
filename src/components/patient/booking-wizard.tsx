"use client";

import { useState, useTransition } from "react";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
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

const STEPS = ["Department", "Doctor", "Date & Slot", "Confirm"] as const;

export function BookingWizard() {
  const [step, setStep] = useState(0);
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

  // Load departments on first step
  function loadDepartments() {
    if (departments.length > 0) return;
    startLoading(async () => {
      const result = await getDepartmentsForBooking();
      if (result.ok) {
        setDepartments(result.departments);
      } else {
        setError(result.error);
      }
    });
  }

  // Load doctors when department selected
  function loadDoctors(deptId: string) {
    startLoading(async () => {
      const result = await getDoctorsByDepartment(deptId);
      if (result.ok) {
        setDoctors(result.doctors);
      } else {
        setError(result.error);
      }
    });
  }

  // Load slots when doctor + date selected
  function loadSlots(doctorId: string, date: Date) {
    const iso = date.toISOString().split("T")[0];
    startLoading(async () => {
      const result = await computeSlots(doctorId, iso);
      if (result.ok) {
        setSlots(result.slots);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSelectDepartment(deptId: string) {
    setError(null);
    setSelectedDept(deptId);
    setDoctors([]);
    setSelectedDoctor(null);
    loadDoctors(deptId);
  }

  function handleSelectDoctor(doctor: Doctor) {
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
    loadSlots(selectedDoctor.id, date);
  }

  function handleConfirm() {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;
    const iso = selectedDate.toISOString().split("T")[0];
    setError(null);
    startBooking(async () => {
      const result = await bookAppointment({
        doctorId: selectedDoctor.id,
        date: iso,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
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
    setStep(0);
    setSelectedDept(null);
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots([]);
    setError(null);
    setSuccess(null);
  }

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
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs",
                  i === step
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-px flex-1",
                  i < step ? "bg-primary/30" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Department */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Choose a Department
          </h2>
          {departments.length === 0 && !loading && (
            <Button onClick={loadDepartments} variant="outline">
              Load departments
            </Button>
          )}
          {loading && departments.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => handleSelectDepartment(dept.id)}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-4 text-left transition-all hover:border-primary/50",
                  selectedDept === dept.id
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border",
                )}
              >
                <span className="font-medium text-foreground">{dept.name}</span>
                {dept.description && (
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {dept.description}
                  </span>
                )}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {dept.doctorCount} doctor{dept.doctorCount !== 1 ? "s" : ""}
                  </span>
                  <span className="font-semibold text-primary">
                    ₹{dept.consultationFee}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {selectedDept && (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                disabled={loading || doctors.length === 0}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Doctor */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Choose a Doctor
          </h2>
          {loading && doctors.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}
          <div className="space-y-2">
            {doctors.map((doc) => {
              const availableDays = doc.scheduleBlocks.map((b) => b.dayOfWeek);
              const nextAvailable = getNextAvailableDay(availableDays);
              return (
                <button
                  key={doc.id}
                  onClick={() => handleSelectDoctor(doc)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary/50",
                    selectedDoctor?.id === doc.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border",
                  )}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Stethoscope className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.specialization}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Next available: {nextAvailable}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
          {doctors.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No doctors found in this department.
            </p>
          )}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setStep(0);
                setError(null);
              }}
            >
              <ChevronLeft className="size-4" />
              Back
            </Button>
            <Button
              onClick={() => {
                setStep(2);
                setError(null);
              }}
              disabled={!selectedDoctor}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Date & Slot */}
      {step === 2 && selectedDoctor && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Pick a Date & Time
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* Date picker */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Date</p>
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

            {/* Slots */}
            <div className="flex-1 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Available slots
              </p>
              {!selectedDate && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Select a date to see available slots.
                </p>
              )}
              {selectedDate && loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-primary" />
                </div>
              )}
              {selectedDate && !loading && slots.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No slots available for this date.
                </p>
              )}
              {selectedDate && !loading && slots.length > 0 && (
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
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setStep(1);
                setError(null);
              }}
            >
              <ChevronLeft className="size-4" />
              Back
            </Button>
            <Button
              onClick={() => {
                setStep(3);
                setError(null);
              }}
              disabled={!selectedSlot}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 3 && selectedDoctor && selectedDate && selectedSlot && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Confirm Your Appointment
          </h2>
          <Card>
            <CardContent className="space-y-3 p-6">
              <Row label="Department" value={selectedDoctor.departmentName} />
              <Row label="Doctor" value={selectedDoctor.name} />
              <Row
                label="Date"
                value={selectedDate.toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              />
              <Row
                label="Time"
                value={`${selectedSlot.startTime} – ${selectedSlot.endTime}`}
              />
              <div className="border-t border-border pt-3">
                <Row
                  label="Consultation Fee"
                  value={`₹${selectedDoctor.consultationFee}`}
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setStep(2);
                setError(null);
              }}
            >
              <ChevronLeft className="size-4" />
              Back
            </Button>
            <Button onClick={handleConfirm} disabled={booking}>
              {booking ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <CalendarPlus className="size-4" />
                  Confirm Booking
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
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
