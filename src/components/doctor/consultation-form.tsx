"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Pill,
  TestTube,
  CheckCircle2,
  Loader2,
  Lock,
  Save,
} from "@/components/ui/icon";
import {
  saveConsultation,
  completeConsultation,
} from "@/actions/consultations";

type Vitals = {
  bp?: string;
  pulse?: string;
  temp?: string;
  weight?: string;
  height?: string;
  spo2?: string;
};

export function ConsultationForm({
  appointmentId,
  consultationId: _consultationId,
  patientId: _patientId,
  initialSymptoms,
  initialDiagnosis,
  initialNotes,
  initialVitals,
  initialFollowUpDate,
  completedAt,
  hasPrescription,
  onSaved,
  onCompleted,
  onOpenPrescription,
  onOpenLabOrder,
}: {
  appointmentId: string;
  consultationId: string;
  patientId: string;
  initialSymptoms?: string;
  initialDiagnosis?: string;
  initialNotes?: string;
  initialVitals?: Vitals;
  initialFollowUpDate?: string;
  completedAt: Date | null;
  hasPrescription: boolean;
  onSaved?: () => void;
  onCompleted?: () => void;
  onOpenPrescription: () => void;
  onOpenLabOrder: () => void;
}) {
  const [symptoms, setSymptoms] = useState(initialSymptoms ?? "");
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [vitals, setVitals] = useState<Vitals>(initialVitals ?? {});
  const [followUpDate, setFollowUpDate] = useState(
    initialFollowUpDate
      ? new Date(initialFollowUpDate).toISOString().split("T")[0]
      : "",
  );
  const [saving, startSave] = useTransition();
  const [completing, startComplete] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const isCompleted = completedAt !== null;
  const elapsed = completedAt
    ? Date.now() - new Date(completedAt).getTime()
    : 0;
  const hoursLeft = completedAt
    ? Math.max(0, 24 - Math.floor(elapsed / (60 * 60 * 1000)))
    : null;
  const isLocked = isCompleted && hoursLeft === 0;

  function handleSave() {
    setError(null);
    startSave(async () => {
      const result = await saveConsultation({
        appointmentId,
        symptoms: symptoms || undefined,
        diagnosis: diagnosis || undefined,
        notes: notes || undefined,
        vitals: vitals || undefined,
        followUpDate: followUpDate || undefined,
      });
      if (result.ok) {
        setSavedAt(new Date());
        onSaved?.();
      } else {
        setError(result.error);
      }
    });
  }

  function handleComplete() {
    setError(null);
    startComplete(async () => {
      const result = await completeConsultation(appointmentId);
      if (result.ok) {
        onCompleted?.();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* 24h edit window indicator */}
        {isCompleted && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              isLocked
                ? "bg-muted text-muted-foreground"
                : "bg-amber-500/10 text-amber-600"
            }`}
          >
            {isLocked ? (
              <>
                <Lock className="size-4" />
                Consultation locked — past 24h edit window
              </>
            ) : (
              <>
                <Clock className="size-4" />
                Edit window: {hoursLeft}h remaining
              </>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Clinical fields */}
        <div className="space-y-1.5">
          <Label htmlFor="symptoms">Symptoms</Label>
          <Textarea
            id="symptoms"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Patient's presenting symptoms"
            rows={3}
            disabled={isLocked}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="diagnosis">Diagnosis</Label>
          <Textarea
            id="diagnosis"
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="Working diagnosis"
            rows={2}
            disabled={isLocked}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Clinical notes, advice, etc."
            rows={2}
            disabled={isLocked}
          />
        </div>

        {/* Vitals grid */}
        <div>
          <Label className="mb-2 block">Vitals</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <VitalInput
              label="BP"
              unit="mmHg"
              value={vitals.bp ?? ""}
              onChange={(v) => setVitals((s) => ({ ...s, bp: v }))}
              disabled={isLocked}
            />
            <VitalInput
              label="Heart Rate"
              unit="bpm"
              value={vitals.pulse ?? ""}
              onChange={(v) => setVitals((s) => ({ ...s, pulse: v }))}
              disabled={isLocked}
            />
            <VitalInput
              label="Temp"
              unit="°F"
              value={vitals.temp ?? ""}
              onChange={(v) => setVitals((s) => ({ ...s, temp: v }))}
              disabled={isLocked}
            />
            <VitalInput
              label="Weight"
              unit="kg"
              value={vitals.weight ?? ""}
              onChange={(v) => setVitals((s) => ({ ...s, weight: v }))}
              disabled={isLocked}
            />
            <VitalInput
              label="Height"
              unit="cm"
              value={vitals.height ?? ""}
              onChange={(v) => setVitals((s) => ({ ...s, height: v }))}
              disabled={isLocked}
            />
            <VitalInput
              label="SpO2"
              unit="%"
              value={vitals.spo2 ?? ""}
              onChange={(v) => setVitals((s) => ({ ...s, spo2: v }))}
              disabled={isLocked}
            />
          </div>
        </div>

        {/* Follow-up date */}
        <div className="space-y-1.5">
          <Label htmlFor="followup">Follow-up Date (optional)</Label>
          <Input
            id="followup"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            disabled={isLocked}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onOpenPrescription}
            disabled={isLocked}
          >
            <Pill className="size-4" />
            {hasPrescription ? "Edit Prescription" : "Add Prescription"}
          </Button>
          <Button
            variant="outline"
            onClick={onOpenLabOrder}
            disabled={isLocked}
          >
            <TestTube className="size-4" />
            Order Lab Tests
          </Button>
        </div>

        {savedAt && (
          <p className="text-xs text-muted-foreground">
            Last saved at {savedAt.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 border-t border-border p-4">
        <Button
          variant="secondary"
          onClick={handleSave}
          disabled={saving || isLocked}
          className="flex-1"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save
        </Button>
        <Button
          onClick={handleComplete}
          disabled={completing || isCompleted || isLocked}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {completing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {isCompleted ? "Completed" : "Complete Consultation"}
        </Button>
      </div>
    </div>
  );
}

function VitalInput({
  label,
  unit,
  value,
  onChange,
  disabled,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          disabled={disabled}
          className="pr-10 text-sm"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

// Inline Clock icon to avoid import clutter
function Clock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
