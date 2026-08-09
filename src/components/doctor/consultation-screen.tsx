"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "@/components/ui/icon";
import { PatientTimeline } from "./patient-timeline";
import { ConsultationForm } from "./consultation-form";
import { PrescriptionSheet } from "./prescription-sheet";
import { LabOrderSheet } from "./lab-order-sheet";
import {
  startConsultation,
  getConsultation,
  getPatientTimeline,
} from "@/actions/consultations";

type Patient = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  gender: string | null;
  bloodGroup: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  allergies: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  medicalHistory: string | null;
};

type Consultation = {
  id: string;
  symptoms: string | null;
  diagnosis: string | null;
  notes: string | null;
  vitals: Record<string, string> | null;
  followUpDate: Date | null;
  completedAt: Date | null;
  prescription: {
    id: string;
    items: {
      id: string;
      medicineId: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string | null;
      quantity: number;
      dispensed: boolean;
      medicine: { name: string };
    }[];
  } | null;
  labTestOrders: {
    id: string;
    status: string;
    priority: string;
    testType: { name: string; code: string };
    result: { results: Record<string, unknown>[]; notes: string | null } | null;
  }[];
};

type TimelineConsultation = {
  id: string;
  symptoms: string | null;
  diagnosis: string | null;
  notes: string | null;
  vitals: Record<string, string> | null;
  completedAt: Date | null;
  createdAt: Date;
  doctor: { user: { name: string | null } };
  appointment: { date: Date };
};

type TimelinePrescription = {
  id: string;
  createdAt: Date;
  items: {
    id: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string | null;
    quantity: number;
    medicine: { name: string };
  }[];
  consultation: {
    doctor: { user: { name: string | null } };
    appointment: { date: Date };
  };
};

type TimelineLabOrder = {
  id: string;
  status: string;
  priority: string;
  createdAt: Date;
  testType: { name: string; code: string };
  result: { results: Record<string, unknown>[]; notes: string | null } | null;
};

function calcAge(dob: Date | null): string {
  if (!dob) return "—";
  const age = new Date().getFullYear() - new Date(dob).getFullYear();
  return `${age}y`;
}

export function ConsultationScreen({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const [loading, startLoad] = useTransition();
  const [starting, startStart] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [timelineData, setTimelineData] = useState<{
    consultations: TimelineConsultation[];
    prescriptions: TimelinePrescription[];
    labOrders: TimelineLabOrder[];
  } | null>(null);
  const [prescriptionSheetOpen, setPrescriptionSheetOpen] = useState(false);
  const [labSheetOpen, setLabSheetOpen] = useState(false);

  useEffect(() => {
    startLoad(async () => {
      const result = await getConsultation(appointmentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const { appointment } = result;
      setPatient(appointment.patient as Patient);
      if (appointment.consultation) {
        setConsultation(appointment.consultation as Consultation);
      }

      // Load timeline
      const timeline = await getPatientTimeline(appointment.patient.id);
      if (timeline.ok) {
        setTimelineData({
          consultations: timeline.consultations as TimelineConsultation[],
          prescriptions: timeline.prescriptions as TimelinePrescription[],
          labOrders: timeline.labOrders as TimelineLabOrder[],
        });
      }
    });
  }, [appointmentId]);

  function handleStartConsultation() {
    startStart(async () => {
      const result = await startConsultation(appointmentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConsultation(result.consultation as unknown as Consultation);
    });
  }

  function refreshConsultation() {
    startLoad(async () => {
      const result = await getConsultation(appointmentId);
      if (result.ok) {
        setConsultation(result.appointment.consultation as Consultation);
        // Also refresh timeline
        if (result.appointment.patient) {
          const timeline = await getPatientTimeline(
            result.appointment.patient.id,
          );
          if (timeline.ok) {
            setTimelineData({
              consultations: timeline.consultations as TimelineConsultation[],
              prescriptions: timeline.prescriptions as TimelinePrescription[],
              labOrders: timeline.labOrders as TimelineLabOrder[],
            });
          }
        }
      }
    });
  }

  if (loading && !patient) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading consultation…</p>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
        <Link href="/doctor/appointments">
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            Back to Appointments
          </Button>
        </Link>
      </div>
    );
  }

  if (!patient) return null;

  const consultationExists = consultation !== null;
  const isCompleted = consultation?.completedAt !== null;
  const elapsed = consultation?.completedAt
    ? Date.now() - new Date(consultation.completedAt).getTime()
    : 0;
  const hoursLeft = consultation?.completedAt
    ? Math.max(0, 24 - Math.floor(elapsed / (60 * 60 * 1000)))
    : null;
  const isLocked = isCompleted && hoursLeft === 0;
  const hasPrescription =
    consultation?.prescription && consultation.prescription.items.length > 0;
  const prescriptionLocked =
    isLocked ||
    (consultation?.prescription?.items.some((i) => i.dispensed) ?? false);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/doctor/appointments">
            <Button variant="ghost" size="icon-sm" aria-label="Back">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {patient.firstName} {patient.lastName}
            </h2>
            <p className="text-xs text-muted-foreground">
              MRN: {patient.mrn} · {calcAge(patient.dateOfBirth)} ·{" "}
              {patient.gender ?? "—"}
            </p>
          </div>
        </div>
        {isCompleted && (
          <Badge variant={isLocked ? "secondary" : "outline"}>
            {isLocked ? "Locked" : `${hoursLeft}h edit window left`}
          </Badge>
        )}
      </div>

      {/* If no consultation yet, show start button */}
      {!consultationExists && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Start the consultation to begin recording clinical data.
            </p>
            <Button
              onClick={handleStartConsultation}
              disabled={starting}
              size="lg"
            >
              {starting ? "Starting…" : "Start Consultation"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
      )}

      {/* Two-pane layout */}
      {consultationExists && consultation && (
        <>
          {/* Desktop: two-pane */}
          <div className="hidden flex-1 gap-0 overflow-hidden lg:flex">
            {/* Left pane — timeline */}
            <div className="w-2/5 overflow-y-auto border-r border-border p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Patient Timeline
              </h3>
              {timelineData && (
                <PatientTimeline
                  patient={patient}
                  consultations={timelineData.consultations}
                  prescriptions={timelineData.prescriptions}
                  labOrders={timelineData.labOrders}
                />
              )}
            </div>

            {/* Right pane — consultation form */}
            <div className="flex-1 overflow-y-auto">
              <ConsultationForm
                appointmentId={appointmentId}
                consultationId={consultation.id}
                patientId={patient.id}
                initialSymptoms={consultation.symptoms ?? undefined}
                initialDiagnosis={consultation.diagnosis ?? undefined}
                initialNotes={consultation.notes ?? undefined}
                initialVitals={consultation.vitals ?? undefined}
                initialFollowUpDate={
                  consultation.followUpDate
                    ? new Date(consultation.followUpDate).toISOString()
                    : undefined
                }
                completedAt={consultation.completedAt}
                hasPrescription={!!hasPrescription}
                onSaved={refreshConsultation}
                onCompleted={refreshConsultation}
                onOpenPrescription={() => setPrescriptionSheetOpen(true)}
                onOpenLabOrder={() => setLabSheetOpen(true)}
              />
            </div>
          </div>

          {/* Mobile: stacked */}
          <div className="flex-1 overflow-y-auto lg:hidden">
            <div className="border-b border-border p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Patient Timeline
              </h3>
              {timelineData && (
                <PatientTimeline
                  patient={patient}
                  consultations={timelineData.consultations}
                  prescriptions={timelineData.prescriptions}
                  labOrders={timelineData.labOrders}
                />
              )}
            </div>
            <div>
              <ConsultationForm
                appointmentId={appointmentId}
                consultationId={consultation.id}
                patientId={patient.id}
                initialSymptoms={consultation.symptoms ?? undefined}
                initialDiagnosis={consultation.diagnosis ?? undefined}
                initialNotes={consultation.notes ?? undefined}
                initialVitals={consultation.vitals ?? undefined}
                initialFollowUpDate={
                  consultation.followUpDate
                    ? new Date(consultation.followUpDate).toISOString()
                    : undefined
                }
                completedAt={consultation.completedAt}
                hasPrescription={!!hasPrescription}
                onSaved={refreshConsultation}
                onCompleted={refreshConsultation}
                onOpenPrescription={() => setPrescriptionSheetOpen(true)}
                onOpenLabOrder={() => setLabSheetOpen(true)}
              />
            </div>
          </div>
        </>
      )}

      {/* Sheets */}
      {consultation && (
        <>
          <PrescriptionSheet
            open={prescriptionSheetOpen}
            onOpenChange={setPrescriptionSheetOpen}
            consultationId={consultation.id}
            existingItems={consultation.prescription?.items}
            locked={prescriptionLocked}
            onSaved={refreshConsultation}
          />
          <LabOrderSheet
            open={labSheetOpen}
            onOpenChange={setLabSheetOpen}
            consultationId={consultation.id}
            patientId={patient.id}
            onOrdered={refreshConsultation}
          />
        </>
      )}
    </div>
  );
}
