"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Download, Pill } from "@/components/ui/icon";

type Prescription = {
  id: string;
  createdAt: Date;
  appointmentDate: Date;
  doctorName: string;
  items: {
    id: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string | null;
    quantity: number;
    medicineName: string;
  }[];
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PrescriptionExpandable({
  prescription,
}: {
  prescription: Prescription;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div
        onClick={() => setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpanded((p) => !p);
        }}
        className="flex w-full cursor-pointer items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-medium text-foreground">
            {formatDate(prescription.appointmentDate)} ·{" "}
            {prescription.items.length} item
            {prescription.items.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            By {prescription.doctorName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
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
      </div>
      {expanded && (
        <div className="mt-3 space-y-1 border-t border-border pt-3">
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
      )}
    </div>
  );
}

export function PrescriptionsList({
  prescriptions,
}: {
  prescriptions: Prescription[];
}) {
  if (prescriptions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Pill className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No prescriptions yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {prescriptions.map((p) => (
        <PrescriptionExpandable key={p.id} prescription={p} />
      ))}
    </div>
  );
}
