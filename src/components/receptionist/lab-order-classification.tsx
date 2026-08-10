"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TestTube,
  CheckCircle2,
  Building2,
  FlaskConical,
} from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getLabOrdersForClassification,
  setLabOrderInternal,
} from "@/actions/billing";

type LabOrder = {
  id: string;
  status: string;
  priority: string;
  createdAt: Date;
  testName: string;
  testCode: string;
  patientName: string;
  patientMrn: string;
  appointmentId: string;
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function LabOrderClassification() {
  const [loading, startLoad] = useTransition();
  const [classifying, startClassify] = useTransition();
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processed, setProcessed] = useState<Set<string>>(new Set());

  useEffect(() => {
    startLoad(async () => {
      const result = await getLabOrdersForClassification();
      if (result.ok) {
        setLabOrders(result.labOrders as LabOrder[]);
      }
    });
  }, []);

  function handleClassify(id: string, isInternal: boolean) {
    setError(null);
    startClassify(async () => {
      const result = await setLabOrderInternal(id, isInternal);
      if (result.ok) {
        setProcessed((prev) => new Set(prev).add(id));
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <TestTube className="size-6 text-primary" />
          Lab Order Classification
        </h1>
        <p className="text-sm text-muted-foreground">
          Mark lab tests as internal (done at this hospital) or external (done
          outside)
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && labOrders.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      ) : labOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="size-8 text-emerald-500" />
            <p className="mt-3 text-sm text-muted-foreground">
              All lab orders have been classified
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>MRN</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labOrders.map((l) => {
                const isProcessed = processed.has(l.id);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium text-foreground">
                      {l.testName}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({l.testCode})
                      </span>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {l.patientName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {l.patientMrn}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(l.createdAt)}
                    </TableCell>
                    <TableCell>
                      {l.priority === "URGENT" && (
                        <Badge variant="destructive">Urgent</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isProcessed ? (
                        <span className="text-xs text-emerald-600">
                          Classified
                        </span>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={classifying}
                            onClick={() => handleClassify(l.id, true)}
                          >
                            <Building2 className="size-3.5" />
                            Internal
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={classifying}
                            onClick={() => handleClassify(l.id, false)}
                          >
                            <FlaskConical className="size-3.5" />
                            External
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
