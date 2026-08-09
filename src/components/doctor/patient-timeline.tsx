"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Activity,
  Pill,
  TestTube,
  User,
  AlertCircle,
} from "@/components/ui/icon";

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
  completedAt: Date | null;
  createdAt: Date;
  doctor: { user: { name: string | null } };
  appointment: { date: Date };
};

type Prescription = {
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

type LabOrder = {
  id: string;
  status: string;
  priority: string;
  createdAt: Date;
  testType: { name: string; code: string };
  result: {
    results: Record<string, unknown>[];
    notes: string | null;
  } | null;
};

function calcAge(dob: Date | null): string {
  if (!dob) return "—";
  const age = new Date().getFullYear() - new Date(dob).getFullYear();
  return `${age}y`;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(status: string) {
  const variant: "default" | "secondary" | "outline" | "destructive" =
    status === "COMPLETED"
      ? "default"
      : status === "PROCESSING"
        ? "secondary"
        : status === "ORDERED"
          ? "outline"
          : status === "CANCELLED"
            ? "destructive"
            : "secondary";
  return <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>;
}

export function PatientTimeline({
  patient,
  consultations,
  prescriptions,
  labOrders,
}: {
  patient: Patient;
  consultations: Consultation[];
  prescriptions: Prescription[];
  labOrders: LabOrder[];
}) {
  return (
    <Tabs defaultValue="consultations" className="h-full">
      <TabsList className="w-full">
        <TabsTrigger value="consultations">
          <Activity className="size-3.5" />
          Consultations
        </TabsTrigger>
        <TabsTrigger value="prescriptions">
          <Pill className="size-3.5" />
          Prescriptions
        </TabsTrigger>
        <TabsTrigger value="labs">
          <TestTube className="size-3.5" />
          Lab Results
        </TabsTrigger>
        <TabsTrigger value="info">
          <User className="size-3.5" />
          Patient Info
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="consultations"
        className="space-y-2 overflow-y-auto p-1"
      >
        {consultations.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No past consultations
          </p>
        )}
        {consultations.map((c) => (
          <ConsultationCard key={c.id} consultation={c} />
        ))}
      </TabsContent>

      <TabsContent
        value="prescriptions"
        className="space-y-2 overflow-y-auto p-1"
      >
        {prescriptions.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No prescriptions
          </p>
        )}
        {prescriptions.map((p) => (
          <PrescriptionCard key={p.id} prescription={p} />
        ))}
      </TabsContent>

      <TabsContent value="labs" className="space-y-2 overflow-y-auto p-1">
        {labOrders.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No lab orders
          </p>
        )}
        {labOrders.map((lo) => (
          <LabOrderCard key={lo.id} labOrder={lo} />
        ))}
      </TabsContent>

      <TabsContent value="info" className="space-y-3 p-1">
        <PatientInfoCard patient={patient} />
      </TabsContent>
    </Tabs>
  );
}

function ConsultationCard({ consultation }: { consultation: Consultation }) {
  const [expanded, setExpanded] = useState(false);
  const doctorName = consultation.doctor?.user?.name ?? "Unknown";
  const vitals = consultation.vitals as {
    bp?: string;
    pulse?: string;
    temp?: string;
    weight?: string;
    height?: string;
  } | null;

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-medium text-foreground">
            {consultation.diagnosis || "No diagnosis recorded"}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(consultation.appointment.date)} · {doctorName}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
          {consultation.symptoms && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Symptoms:{" "}
              </span>
              <span className="text-foreground">{consultation.symptoms}</span>
            </div>
          )}
          {consultation.notes && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Notes:{" "}
              </span>
              <span className="text-foreground">{consultation.notes}</span>
            </div>
          )}
          {vitals && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              {vitals.bp && <div>BP: {vitals.bp}</div>}
              {vitals.pulse && <div>Pulse: {vitals.pulse}</div>}
              {vitals.temp && <div>Temp: {vitals.temp}</div>}
              {vitals.weight && <div>Weight: {vitals.weight}kg</div>}
              {vitals.height && <div>Height: {vitals.height}cm</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PrescriptionCard({ prescription }: { prescription: Prescription }) {
  const [expanded, setExpanded] = useState(false);
  const doctorName = prescription.consultation?.doctor?.user?.name ?? "Unknown";

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-medium text-foreground">
            {formatDate(prescription.consultation.appointment.date)} ·{" "}
            {prescription.items.length} item
            {prescription.items.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground">By {doctorName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              // PDF download handled by parent via link
              window.open(
                `/api/prescriptions/${prescription.id}/pdf`,
                "_blank",
              );
            }}
            aria-label="Download PDF"
          >
            <Download className="size-4" />
          </Button>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="mt-3 space-y-1 border-t border-border pt-3">
          {prescription.items.map((item) => (
            <div key={item.id} className="text-sm">
              <span className="font-medium text-foreground">
                {item.medicine.name}
              </span>
              <span className="text-muted-foreground">
                {" "}
                — {item.dosage}, {item.frequency}, {item.duration}
              </span>
              {item.instructions && (
                <span className="text-xs text-muted-foreground">
                  {" "}
                  ({item.instructions})
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LabOrderCard({ labOrder }: { labOrder: LabOrder }) {
  const [expanded, setExpanded] = useState(false);
  const results = labOrder.result?.results as
    | {
        parameter: string;
        value: string;
        unit: string;
        referenceRange: string;
      }[]
    | null;

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-medium text-foreground">
            {labOrder.testType.name} ({labOrder.testType.code})
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(labOrder.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge(labOrder.status)}
          {labOrder.priority === "URGENT" && (
            <Badge variant="destructive">Urgent</Badge>
          )}
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          {results && results.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="py-1 text-left">Parameter</th>
                  <th className="py-1 text-left">Value</th>
                  <th className="py-1 text-left">Unit</th>
                  <th className="py-1 text-left">Ref Range</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="py-1">{r.parameter}</td>
                    <td className="py-1 font-medium">{r.value}</td>
                    <td className="py-1">{r.unit}</td>
                    <td className="py-1 text-muted-foreground">
                      {r.referenceRange}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              {labOrder.result?.notes || "Results pending"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PatientInfoCard({ patient }: { patient: Patient }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-3">
        <h4 className="mb-2 text-sm font-semibold text-foreground">
          Demographics
        </h4>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">MRN</dt>
            <dd className="text-foreground">{patient.mrn}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Age/Gender</dt>
            <dd className="text-foreground">
              {calcAge(patient.dateOfBirth)} / {patient.gender ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Blood Group</dt>
            <dd className="text-foreground">{patient.bloodGroup ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd className="text-foreground">{patient.phone}</dd>
          </div>
        </dl>
      </div>

      {patient.allergies && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <h4 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-amber-600">
            <AlertCircle className="size-4" />
            Allergies
          </h4>
          <p className="text-sm text-amber-700">{patient.allergies}</p>
        </div>
      )}

      {patient.medicalHistory && (
        <div className="rounded-lg border border-border bg-card p-3">
          <h4 className="mb-1 text-sm font-semibold text-foreground">
            Medical History
          </h4>
          <p className="text-sm text-muted-foreground">
            {patient.medicalHistory}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-3">
        <h4 className="mb-2 text-sm font-semibold text-foreground">
          Emergency Contact
        </h4>
        <dl className="space-y-1 text-sm">
          {patient.emergencyName && (
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="text-foreground">{patient.emergencyName}</dd>
            </div>
          )}
          {patient.emergencyPhone && (
            <div>
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd className="text-foreground">{patient.emergencyPhone}</dd>
            </div>
          )}
          {patient.emergencyRelation && (
            <div>
              <dt className="text-xs text-muted-foreground">Relation</dt>
              <dd className="text-foreground">{patient.emergencyRelation}</dd>
            </div>
          )}
          {!patient.emergencyName && (
            <p className="text-sm text-muted-foreground">
              No emergency contact
            </p>
          )}
        </dl>
      </div>
    </div>
  );
}
