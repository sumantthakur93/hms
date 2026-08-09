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
} from "lucide-react";
import { createPatient, type PatientInput } from "@/actions/patients";
import { checkDuplicatePhone as checkDuplicate } from "@/actions/auth";

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
          <h3 className="text-lg font-semibold text-slate-100">
            Patient Registered
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            MRN:{" "}
            <span className="font-mono font-semibold text-blue-400">
              {createdMrn}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/receptionist"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <CalendarPlus className="size-4" />
            Book Appointment
          </a>
          <button
            onClick={handleRegisterAnother}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            <UserPlus className="size-4" />
            Register Another
          </button>
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
              <button
                type="button"
                onClick={(e) =>
                  handleSubmit(e as unknown as React.FormEvent, true)
                }
                className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
              >
                Continue anyway
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setDuplicateInfo(null);
                }}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
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
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="input"
            placeholder="Rahul"
            required
          />
        </Field>
        <Field label="Last name" required>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="input"
            placeholder="Kumar"
            required
          />
        </Field>
      </div>

      <Field label="Phone" required>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input pl-10"
            placeholder="+91 98765 43210"
            required
          />
        </div>
      </Field>

      {/* Optional section toggle */}
      <button
        type="button"
        onClick={() => setShowOptional(!showOptional)}
        className="flex w-full items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-300"
      >
        <ChevronDown
          className={`size-4 transition-transform ${showOptional ? "rotate-180" : ""}`}
        />
        More about the patient
      </button>

      {/* Optional fields */}
      {showOptional && (
        <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="rahul@example.com"
              />
            </Field>
            <Field label="Date of birth">
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Gender">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="input"
              >
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Blood group">
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="input"
              >
                <option value="">Select</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                  (bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ),
                )}
              </select>
            </Field>
          </div>

          <Field label="Address">
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input min-h-[60px] resize-y"
              placeholder="123 Main St, Mumbai, MH 400001"
            />
          </Field>

          <div className="border-t border-slate-800 pt-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Emergency contact
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name">
                <input
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="input"
                  placeholder="Sunita Kumar"
                />
              </Field>
              <Field label="Phone">
                <input
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="input"
                  placeholder="+91 98765 43211"
                />
              </Field>
            </div>
            <Field label="Relation" className="mt-3">
              <input
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                className="input"
                placeholder="Spouse / Mother / Father"
              />
            </Field>
          </div>

          <Field label="Allergies">
            <textarea
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="input min-h-[40px] resize-y"
              placeholder="Penicillin, peanuts, ..."
            />
          </Field>

          <Field label="Medical history">
            <textarea
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              className="input min-h-[40px] resize-y"
              placeholder="Diabetes, hypertension, ..."
            />
          </Field>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "checking-phone" || status === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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
      </button>
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
      <label className="mb-1 block text-xs font-medium text-slate-400">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}
