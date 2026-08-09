"use client";

import { useState } from "react";
import { Save, Loader2, AlertCircle, Lock } from "lucide-react";
import { updatePatient } from "@/actions/patients";

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
    patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split("T")[0] : "",
  );
  const [gender, setGender] = useState(patient.gender ?? "");
  const [bloodGroup, setBloodGroup] = useState(patient.bloodGroup ?? "");
  const [address, setAddress] = useState(patient.address ?? "");
  const [emergencyName, setEmergencyName] = useState(patient.emergencyName ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(patient.emergencyPhone ?? "");
  const [emergencyRelation, setEmergencyRelation] = useState(patient.emergencyRelation ?? "");
  const [allergies, setAllergies] = useState(patient.allergies ?? "");
  const [medicalHistory, setMedicalHistory] = useState(patient.medicalHistory ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updatePatient(patient.id, {
      firstName, lastName,
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
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">MRN</label>
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2.5">
          <Lock className="size-3.5 text-slate-600" />
          <span className="font-mono text-sm font-semibold text-slate-300">{patient.mrn}</span>
        </div>
        <p className="mt-1 text-xs text-slate-600">MRN is immutable and cannot be changed</p>
      </div>

      {/* Phone (read-only — not editable via update schema) */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Phone</label>
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2.5">
          <Lock className="size-3.5 text-slate-600" />
          <span className="text-sm text-slate-300">{patient.phone}</span>
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
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">First name</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Last name</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Date of birth</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="input">
            <option value="">Select</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Blood group</label>
          <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="input">
            <option value="">Select</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Address</label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="input min-h-[60px] resize-y"
        />
      </div>

      <div className="border-t border-slate-800 pt-3">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Emergency contact
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Name</label>
            <input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Phone</label>
            <input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="input" />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-slate-400">Relation</label>
          <input value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} className="input" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Allergies</label>
        <textarea
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          className="input min-h-[40px] resize-y"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Medical history</label>
        <textarea
          value={medicalHistory}
          onChange={(e) => setMedicalHistory(e.target.value)}
          className="input min-h-[40px] resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? (
          <><Loader2 className="size-4 animate-spin" /> Saving...</>
        ) : (
          <><Save className="size-4" /> Save Changes</>
        )}
      </button>
    </form>
  );
}
