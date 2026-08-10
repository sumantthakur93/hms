"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TestTube,
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
import { labStatusBadge } from "@/components/ui/status-badges";

type LabOrder = {
  id: string;
  status: string;
  priority: string;
  isInternal: boolean;
  createdAt: Date;
  testName: string;
  testCode: string;
  doctorName: string;
  result: {
    results: Record<string, string>[];
    notes: string | null;
    fileUrl: string | null;
  } | null;
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
            {labOrder.testName} ({labOrder.testCode})
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(labOrder.createdAt)} · By {labOrder.doctorName}
            {!labOrder.isInternal && " · External"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {labStatusBadge(labOrder.status)}
          {labOrder.priority === "URGENT" && (
            <Badge variant="destructive">Urgent</Badge>
          )}
          {labOrder.result?.fileUrl && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(labOrder.result!.fileUrl!, "_blank");
              }}
              aria-label="Download result file"
            >
              <Download className="size-4" />
            </Button>
          )}
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 border-t border-border pt-3">
          {results && results.length > 0 ? (
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
                    <TableCell className="text-muted-foreground">
                      {r.unit}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.referenceRange}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : labOrder.result?.notes ? (
            <p className="text-sm text-muted-foreground">
              {labOrder.result.notes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Results pending</p>
          )}
        </div>
      )}
    </div>
  );
}

export function LabResultsList({ labOrders }: { labOrders: LabOrder[] }) {
  if (labOrders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <TestTube className="size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No lab tests yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {labOrders.map((l) => (
        <LabOrderExpandable key={l.id} labOrder={l} />
      ))}
    </div>
  );
}
