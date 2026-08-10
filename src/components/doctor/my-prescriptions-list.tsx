"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Pill,
  ChevronDown,
  ChevronUp,
  Download,
} from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDoctorPrescriptions } from "@/actions/consultations";

type Prescription = {
  id: string;
  createdAt: Date;
  appointmentDate: Date;
  patientId: string;
  patientName: string;
  patientMrn: string;
  itemCount: number;
  items: Array<{
    id: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string | null;
    quantity: number;
    medicineName: string;
  }>;
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function PrescriptionExpandable({ prescription }: { prescription: Prescription }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow
        onClick={() => setExpanded((e) => !e)}
        className="cursor-pointer"
      >
        <TableCell className="font-medium text-foreground">
          {formatDate(prescription.appointmentDate)}
        </TableCell>
        <TableCell className="text-foreground">{prescription.patientName}</TableCell>
        <TableCell className="text-muted-foreground">{prescription.patientMrn}</TableCell>
        <TableCell className="text-muted-foreground">{prescription.itemCount}</TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`/api/prescriptions/${prescription.id}/pdf`, "_blank");
              }}
              aria-label="Download PDF"
            >
              <Download className="size-4" />
            </Button>
            {expanded ? (
              <ChevronUp className="size-4 self-center text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 self-center text-muted-foreground" />
            )}
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={5} className="bg-muted/30">
            <div className="space-y-1 py-2">
              {prescription.items.map((item) => (
                <div key={item.id} className="text-sm">
                  <span className="font-medium text-foreground">
                    {item.medicineName}
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
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function MyPrescriptionsList() {
  const [loading, startLoad] = useTransition();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  useEffect(() => {
    startLoad(async () => {
      const result = await getDoctorPrescriptions();
      if (result.ok) {
        setPrescriptions(result.prescriptions as Prescription[]);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Prescriptions</h1>
        <p className="text-sm text-muted-foreground">
          Prescriptions you have written
        </p>
      </div>

      {loading && prescriptions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : prescriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Pill className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No prescriptions yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>MRN</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((p) => (
                <PrescriptionExpandable key={p.id} prescription={p} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
