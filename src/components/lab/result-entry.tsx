"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Loader2, Save, CheckCircle2, Upload } from "@/components/ui/icon";
import { getLabOrder, saveDraftResults, submitResults } from "@/actions/lab";

type ResultRow = {
  parameter: string;
  value: string;
  unit: string;
  referenceRange: string;
};

type Order = {
  id: string;
  status: string;
  priority: string;
  patient: {
    mrn: string;
    firstName: string;
    lastName: string;
    gender: string | null;
    dateOfBirth: Date | null;
  };
  testType: { name: string; code: string; category: string };
  result: {
    id: string;
    results: ResultRow[];
    notes: string | null;
    fileUrl: string | null;
  } | null;
};

function calcAge(dob: Date | null): string {
  if (!dob) return "—";
  return `${new Date().getFullYear() - new Date(dob).getFullYear()}y`;
}

// Default CBC rows
const DEFAULT_CBC_ROWS: ResultRow[] = [
  { parameter: "Hemoglobin", value: "", unit: "g/dL", referenceRange: "13-17" },
  { parameter: "RBC Count", value: "", unit: "million/µL", referenceRange: "4.5-5.5" },
  { parameter: "WBC Count", value: "", unit: "/µL", referenceRange: "4000-11000" },
  { parameter: "Platelet Count", value: "", unit: "lakh/µL", referenceRange: "1.5-4.5" },
];

export function ResultEntry({ labTestOrderId }: { labTestOrderId: string }) {
  const router = useRouter();
  const [loading, startLoad] = useTransition();
  const [saving, startSave] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [notes, setNotes] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    startLoad(async () => {
      const result = await getLabOrder(labTestOrderId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const o = result.order as Order;
      setOrder(o);
      if (o.result) {
        setRows(o.result.results as ResultRow[]);
        setNotes(o.result.notes ?? "");
        setFileUrl(o.result.fileUrl ?? null);
      } else {
        // Pre-fill with CBC defaults if it's a CBC test
        if (o.testType.code === "CBC") {
          setRows(DEFAULT_CBC_ROWS);
        } else {
          setRows([{ parameter: "", value: "", unit: "", referenceRange: "" }]);
        }
      }
    });
  }, [labTestOrderId]);

  function addRow() {
    setRows((prev) => [...prev, { parameter: "", value: "", unit: "", referenceRange: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof ResultRow, value: string) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("orderId", labTestOrderId);

    try {
      const res = await fetch("/api/lab/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setFileUrl(data.url);
      }
    } catch {
      setError("File upload failed");
    }
  }

  function handleSaveDraft() {
    if (!order) return;
    setError(null);
    startSave(async () => {
      const result = await saveDraftResults({
        labTestOrderId: order.id,
        results: rows,
        notes: notes || undefined,
        fileUrl: fileUrl || undefined,
      });
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  function handleSubmit() {
    if (!order) return;
    setError(null);
    startSubmit(async () => {
      const result = await submitResults({
        labTestOrderId: order.id,
        results: rows,
        notes: notes || undefined,
        fileUrl: fileUrl || undefined,
      });
      if (result.ok) {
        router.push("/lab/queue");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (loading && !order) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
        <Link href="/lab/queue">
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            Back to Queue
          </Button>
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const isCompleted = order.status === "COMPLETED";
  const canEdit = order.status === "SAMPLE_COLLECTED" || order.status === "PROCESSING";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/lab/queue">
            <Button variant="ghost" size="icon-sm" aria-label="Back">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {order.patient.firstName} {order.patient.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              MRN: {order.patient.mrn} · {calcAge(order.patient.dateOfBirth)} ·{" "}
              {order.patient.gender ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {order.priority === "URGENT" && <Badge variant="destructive">Urgent</Badge>}
          <Badge variant={isCompleted ? "outline" : "default"}>
            {order.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>

      {/* Test info */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-foreground">{order.testType.name}</p>
          <p className="text-xs text-muted-foreground">
            {order.testType.code} · {order.testType.category}
          </p>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Results</h2>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="size-4" />
              Add Row
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-2 text-left font-medium">Parameter</th>
                <th className="py-2 text-left font-medium">Value</th>
                <th className="py-2 text-left font-medium">Unit</th>
                <th className="py-2 text-left font-medium">Ref Range</th>
                {canEdit && <th className="py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-border/50">
                  <td className="py-2 pr-2">
                    {canEdit ? (
                      <Input
                        value={row.parameter}
                        onChange={(e) => updateRow(index, "parameter", e.target.value)}
                        placeholder="Parameter"
                        className="text-sm"
                      />
                    ) : (
                      <span className="text-foreground">{row.parameter}</span>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    {canEdit ? (
                      <Input
                        value={row.value}
                        onChange={(e) => updateRow(index, "value", e.target.value)}
                        placeholder="Value"
                        className="text-sm"
                      />
                    ) : (
                      <span className="font-medium text-foreground">{row.value}</span>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    {canEdit ? (
                      <Input
                        value={row.unit}
                        onChange={(e) => updateRow(index, "unit", e.target.value)}
                        placeholder="Unit"
                        className="text-sm"
                      />
                    ) : (
                      <span className="text-muted-foreground">{row.unit}</span>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    {canEdit ? (
                      <Input
                        value={row.referenceRange}
                        onChange={(e) => updateRow(index, "referenceRange", e.target.value)}
                        placeholder="Ref Range"
                        className="text-sm"
                      />
                    ) : (
                      <span className="text-muted-foreground">{row.referenceRange}</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="py-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeRow(index)}
                        aria-label="Remove row"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes about the results"
          rows={3}
          disabled={!canEdit}
        />
      </div>

      {/* File upload */}
      <div className="space-y-1.5">
        <Label>File Attachment</Label>
        {fileUrl ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
            <Upload className="size-4 text-muted-foreground" />
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              View uploaded file
            </a>
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFileUrl(null)}
                className="ml-auto"
              >
                Remove
              </Button>
            )}
          </div>
        ) : canEdit ? (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 p-6 text-center">
            <Upload className="size-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Click to upload PDF or image
            </p>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        ) : (
          <p className="text-sm text-muted-foreground">No file attached</p>
        )}
      </div>

      {/* Action buttons */}
      {canEdit && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex-1"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Draft
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Submit Result
          </Button>
        </div>
      )}
    </div>
  );
}
