"use client";

import { useState } from "react";
import {
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Phone,
  CalendarPlus,
} from "@/components/ui/icon";
import { createPatient, type PatientInput } from "@/actions/patients";
import { checkDuplicatePhone as checkDuplicate } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";

type Status =
  | "idle"
  | "checking-phone"
  | "duplicate-warning"
  | "submitting"
  | "success"
  | "error";

export function PatientRegistrationForm({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showOptional, setShowOptional] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    firstName: string;
    lastName: string;
  } | null>(null);
  const [createdMrn, setCreatedMrn] = useState<string | null>(null);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");

  function resetForm() {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setDateOfBirth("");
    setGender("");
    setBloodGroup("");
    setAddress("");
    setEmergencyName("");
    setEmergencyPhone("");
    setEmergencyRelation("");
    setAllergies("");
    setMedicalHistory("");
    setShowOptional(false);
    setDuplicateInfo(null);
  }

  async function handleSubmit(e: React.FormEvent, overrideDuplicate = false) {
    e.preventDefault();
    setError(null);

    if (!overrideDuplicate) {
      // Check for duplicate phone
      setStatus("checking-phone");
      const dup = await checkDuplicate(phone);
      if (dup.duplicate && dup.existingPatient) {
        setDuplicateInfo({
          firstName: dup.existingPatient.firstName,
          lastName: dup.existingPatient.lastName,
        });
        setStatus("duplicate-warning");
        return;
      }
    }

    setStatus("submitting");
    setDuplicateInfo(null);

    const input: PatientInput = {
      firstName,
      lastName,
      phone,
      email: email || undefined,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender ? (gender as "MALE" | "FEMALE" | "OTHER") : undefined,
      bloodGroup: bloodGroup || undefined,
      address: address || undefined,
      emergencyName: emergencyName || undefined,
      emergencyPhone: emergencyPhone || undefined,
      emergencyRelation: emergencyRelation || undefined,
      allergies: allergies || undefined,
      medicalHistory: medicalHistory || undefined,
    };

    const result = await createPatient(input);

    if (result.ok) {
      setCreatedMrn(result.patient.mrn);
      setStatus("success");
      onCreated?.();
    } else {
      setError(result.error);
      setStatus("error");
    }
  }

  function handleRegisterAnother() {
    resetForm();
    setCreatedMrn(null);
    setStatus("idle");
  }

  // ─── Success state ──────────────────────────────────────────────────────
  if (status === "success" && createdMrn) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="size-7 text-green-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Patient Registered
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            MRN:{" "}
            <span className="font-mono font-semibold text-primary">
              {createdMrn}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button render={<a href="/receptionist" />}>
            <CalendarPlus className="size-4" />
            Book Appointment
          </Button>
          <Button variant="outline" onClick={handleRegisterAnother}>
            <UserPlus className="size-4" />
            Register Another
          </Button>
        </div>
      </div>
    );
  }

  // ─── Form ───────────────────────────────────────────────────────────────
  return (
    <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
      {/* Duplicate phone warning */}
      {status === "duplicate-warning" && duplicateInfo && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-700/50 bg-amber-900/20 p-4">
          <AlertCircle className="size-5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-200">
              Duplicate phone number
            </p>
            <p className="mt-1 text-xs text-amber-300/80">
              A patient named {duplicateInfo.firstName} {duplicateInfo.lastName}{" "}
              already has this phone number. Continue anyway?
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={(e) =>
                  handleSubmit(e as unknown as React.FormEvent, true)
                }
                className="bg-amber-600 hover:bg-amber-700"
              >
                Continue anyway
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatus("idle");
                  setDuplicateInfo(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-300">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Required fields */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" required>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Rahul"
            required
          />
        </Field>
        <Field label="Last name" required>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Kumar"
            required
          />
        </Field>
      </div>

      <Field label="Phone" required>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-10"
            placeholder="+91 98765 43210"
            required
          />
        </div>
      </Field>

      {/* Optional section toggle */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => setShowOptional(!showOptional)}
        className="w-full justify-start text-muted-foreground"
      >
        <ChevronDown
          className={`size-4 transition-transform ${showOptional ? "rotate-180" : ""}`}
        />
        More about the patient
      </Button>

      {/* Optional fields */}
      {showOptional && (
        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@example.com"
              />
            </Field>
            <Field label="Date of birth">
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Gender">
              <Select value={gender} onValueChange={(v) => setGender(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Blood group">
              <Select
                value={bloodGroup}
                onValueChange={(v) => setBloodGroup(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                    (bg) => (
                      <SelectItem key={bg} value={bg}>
                        {bg}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Address">
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="min-h-[60px] resize-y"
              placeholder="123 Main St, Mumbai, MH 400001"
            />
          </Field>

          <div className="border-t border-border pt-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Emergency contact
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <Input
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Sunita Kumar"
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="+91 98765 43211"
                />
              </Field>
            </div>
            <Field label="Relation" className="mt-3">
              <Input
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                placeholder="Spouse / Mother / Father"
              />
            </Field>
          </div>

          <Field label="Allergies">
            <Textarea
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="min-h-[40px] resize-y"
              placeholder="Penicillin, peanuts, ..."
            />
          </Field>

          <Field label="Medical history">
            <Textarea
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              className="min-h-[40px] resize-y"
              placeholder="Diabetes, hypertension, ..."
            />
          </Field>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={status === "checking-phone" || status === "submitting"}
        className="w-full"
        size="lg"
      >
        {status === "checking-phone" || status === "submitting" ? (
          <>
            <Loader2 className="size-4 animate-spin" />{" "}
            {status === "checking-phone" ? "Checking..." : "Registering..."}
          </>
        ) : (
          <>
            <UserPlus className="size-4" /> Register Patient
          </>
        )}
      </Button>
    </form>
  );
}

// ─── Reusable field wrapper ────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1 text-xs">
        {label} {required && <span className="text-red-400">*</span>}
      </Label>
      {children}
    </div>
  );
}
