"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TestTube, ChevronDown, ChevronUp } from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { labStatusBadge } from "@/components/ui/status-badges";
import { getDoctorLabOrders } from "@/actions/consultations";

type LabOrder = {
  id: string;
  status: string;
  priority: string;
  isInternal: boolean;
  createdAt: Date;
  testName: string;
  testCode: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  result: {
    results: Record<string, string>[];
    notes: string | null;
  } | null;
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isPending(status: string) {
  return status === "ORDERED" || status === "SAMPLE_COLLECTED" || status === "PROCESSING";
}

function LabOrderExpandable({ labOrder }: { labOrder: LabOrder }) {
  const [expanded, setExpanded] = useState(false);
  const results = labOrder.result?.results as Array<{
    parameter: string;
    value: string;
    unit: string;
    referenceRange: string;
  }>;

  return (
    <>
      <TableRow
        onClick={() => labOrder.result && setExpanded((e) => !e)}
        className={labOrder.result ? "cursor-pointer" : ""}
      >
        <TableCell className="font-medium text-foreground">
          {labOrder.testName}
          {!labOrder.isInternal && (
            <span className="ml-1 text-xs text-muted-foreground">(ext)</span>
          )}
        </TableCell>
        <TableCell className="text-foreground">{labOrder.patientName}</TableCell>
        <TableCell className="text-muted-foreground">{labOrder.patientMrn}</TableCell>
        <TableCell className="text-muted-foreground">{formatDate(labOrder.createdAt)}</TableCell>
        <TableCell>{labStatusBadge(labOrder.status)}</TableCell>
        <TableCell>
          {labOrder.priority === "URGENT" && (
            <Badge variant="destructive">Urgent</Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          {labOrder.result ? (
            expanded ? (
              <ChevronUp className="ml-auto size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="ml-auto size-4 text-muted-foreground" />
            )
          ) : null}
        </TableCell>
      </TableRow>
      {expanded && results && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={7} className="bg-muted/30">
            <div className="py-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Reference Range</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.parameter}</TableCell>
                      <TableCell>{r.value}</TableCell>
                      <TableCell className="text-muted-foreground">{r.unit}</TableCell>
                      <TableCell className="text-muted-foreground">{r.referenceRange}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {labOrder.result?.notes && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Notes: {labOrder.result.notes}
                </p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function MyLabOrdersList() {
  const [loading, startLoad] = useTransition();
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");

  useEffect(() => {
    startLoad(async () => {
      const result = await getDoctorLabOrders();
      if (result.ok) {
        setLabOrders(result.labOrders as LabOrder[]);
      }
    });
  }, []);

  const filtered = labOrders.filter((l) => {
    if (filter === "ALL") return true;
    if (filter === "PENDING") return isPending(l.status);
    return l.status === "COMPLETED";
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lab Results</h1>
        <p className="text-sm text-muted-foreground">
          Lab tests you have ordered
        </p>
      </div>

      <div className="flex gap-1.5">
        <Button
          variant={filter === "ALL" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("ALL")}
        >
          All
        </Button>
        <Button
          variant={filter === "PENDING" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("PENDING")}
        >
          Pending
        </Button>
        <Button
          variant={filter === "COMPLETED" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("COMPLETED")}
        >
          Completed
        </Button>
      </div>

      {loading && labOrders.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TestTube className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No lab orders {filter !== "ALL" ? `(${filter.toLowerCase()})` : "yet"}
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
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">Results</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <LabOrderExpandable key={l.id} labOrder={l} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
