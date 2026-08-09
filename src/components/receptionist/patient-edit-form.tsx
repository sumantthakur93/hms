"use client";

import { useState } from "react";
import {
  Save,
  Loader2,
  AlertCircle,
  Lock,
} from "@/components/ui/icon";
import { updatePatient } from "@/actions/patients";
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

type Patient = {
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
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  allergies: string | null;
  medicalHistory: string | null;
};

export function PatientEditForm({
  patient,
  onSaved,
}: {
  patient: Patient;
  onSaved?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Editable fields
  const [firstName, setFirstName] = useState(patient.firstName);
  const [lastName, setLastName] = useState(patient.lastName);
  const [email, setEmail] = useState(patient.email ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    patient.dateOfBirth
      ? new Date(patient.dateOfBirth).toISOString().split("T")[0]
      : "",
  );
  const [gender, setGender] = useState(patient.gender ?? "");
  const [bloodGroup, setBloodGroup] = useState(patient.bloodGroup ?? "");
  const [address, setAddress] = useState(patient.address ?? "");
  const [emergencyName, setEmergencyName] = useState(
    patient.emergencyName ?? "",
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    patient.emergencyPhone ?? "",
  );
  const [emergencyRelation, setEmergencyRelation] = useState(
    patient.emergencyRelation ?? "",
  );
  const [allergies, setAllergies] = useState(patient.allergies ?? "");
  const [medicalHistory, setMedicalHistory] = useState(
    patient.medicalHistory ?? "",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updatePatient(patient.id, {
      firstName,
      lastName,
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
    });

    setSaving(false);
    if (result.ok) {
      setSaved(true);
      onSaved?.();
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* MRN (read-only) */}
      <div className="space-y-1.5">
        <Label>MRN</Label>
        <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/50 px-3 py-2">
          <Lock className="size-3.5 text-muted-foreground" />
          <span className="font-mono text-sm font-semibold text-foreground">
            {patient.mrn}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          MRN is immutable and cannot be changed
        </p>
      </div>

      {/* Phone (read-only — not editable via update schema) */}
      <div className="space-y-1.5">
        <Label>Phone</Label>
        <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/50 px-3 py-2">
          <Lock className="size-3.5 text-muted-foreground" />
          <span className="text-sm text-foreground">{patient.phone}</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-300">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-lg border border-green-800/50 bg-green-900/20 p-3 text-sm text-green-300">
          Changes saved successfully
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>First name</Label>
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Last name</Label>
          <Input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Date of birth</Label>
          <Input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Gender</Label>
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
        </div>
        <div className="space-y-1.5">
          <Label>Blood group</Label>
          <Select
            value={bloodGroup}
            onValueChange={(v) => setBloodGroup(v ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                <SelectItem key={bg} value={bg}>
                  {bg}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Address</Label>
        <Textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="min-h-[60px] resize-y"
        />
      </div>

      <div className="border-t border-border pt-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Emergency contact
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <Label>Relation</Label>
          <Input
            value={emergencyRelation}
            onChange={(e) => setEmergencyRelation(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Allergies</Label>
        <Textarea
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          className="min-h-[40px] resize-y"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Medical history</Label>
        <Textarea
          value={medicalHistory}
          onChange={(e) => setMedicalHistory(e.target.value)}
          className="min-h-[40px] resize-y"
        />
      </div>

      <Button type="submit" disabled={saving} className="w-full" size="lg">
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Saving...
          </>
        ) : (
          <>
            <Save className="size-4" /> Save Changes
          </>
        )}
      </Button>
    </form>
  );
}
