"use client";

import { useState, useTransition } from "react";
import {
  Search,
  UserPlus,
  Loader2,
  AlertCircle,
  ChevronRight,
  User,
} from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { WalkInForm } from "./walk-in-form";
import { BookingWizard } from "@/components/patient/booking-wizard";
import { findPatientByPhone } from "@/actions/appointments";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string;
  phone: string;
};

export function BookOnBehalf() {
  const [step, setStep] = useState<"search" | "book">("search");
  const [phone, setPhone] = useState("");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSearch(async () => {
      const result = await findPatientByPhone(phone);
      if (result.ok) {
        setPatient(result.patient);
      } else {
        setError(result.error);
      }
    });
  }

  function handleWalkInRegistered(patientId: string, name: string) {
    setPatient({
      id: patientId,
      firstName: name.split(" ")[0] ?? "",
      lastName: name.split(" ").slice(1).join(" ") ?? "",
      mrn: "",
      phone,
    });
  }

  if (step === "book" && patient) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2">
            <User className="size-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {patient.firstName} {patient.lastName}
            </span>
            {patient.mrn && (
              <span className="font-mono text-xs text-muted-foreground">
                {patient.mrn}
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setStep("search");
              setPatient(null);
            }}
          >
            Change Patient
          </Button>
        </div>
        <BookingWizard receptionistPatientId={patient.id} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient search */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Search className="size-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Find Patient
          </h2>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter patient phone number"
            required
          />
          <Button type="submit" disabled={searching}>
            {searching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            Search
          </Button>
        </form>
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}
        {patient && (
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-foreground">
                  {patient.firstName} {patient.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  MRN: {patient.mrn} · {patient.phone}
                </p>
              </div>
              <Button onClick={() => setStep("book")}>
                Book Appointment
                <ChevronRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Walk-in registration shortcut */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="size-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Walk-in Registration
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          New patient? Register quickly, then book immediately.
        </p>
        <WalkInForm onRegistered={handleWalkInRegistered} />
      </div>
    </div>
  );
}
