"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Ban,
  Package,
  IndianRupee,
  Layers,
  AlertTriangle,
} from "@/components/ui/icon";
import {
  getMedicine,
  addBatch,
  adjustStock,
  deactivateMedicine,
} from "@/actions/pharmacy";

type Batch = {
  id: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  status: "FRESH" | "NEAR_EXPIRY" | "EXPIRED";
  fefoOrder: number | null;
};

type Medicine = {
  id: string;
  name: string;
  genericName: string;
  manufacturer: string | null;
  category: string | null;
  unitPrice: number;
  reorderLevel: number;
  active: boolean;
  batches: Batch[];
  totalStock: number;
  totalValue: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
};

function batchStatusBadge(status: string) {
  const variant: "default" | "secondary" | "destructive" =
    status === "FRESH"
      ? "default"
      : status === "NEAR_EXPIRY"
        ? "secondary"
        : "destructive";
  return <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function MedicineDetail({ medicineId }: { medicineId: string }) {
  const [loading, startLoad] = useTransition();
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  // Batch form state
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchQty, setBatchQty] = useState("");
  const [batchError, setBatchError] = useState<string | null>(null);
  const [savingBatch, startSaveBatch] = useTransition();

  // Adjustment form state
  const [newQty, setNewQty] = useState("");
  const [reason, setReason] = useState<"DAMAGE" | "RECOUNT" | "OTHER">(
    "RECOUNT",
  );
  const [adjustNotes, setAdjustNotes] = useState("");
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [savingAdjust, startSaveAdjust] = useTransition();

  function loadMedicine() {
    startLoad(async () => {
      const result = await getMedicine(medicineId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMedicine(result.medicine as Medicine);
    });
  }

  useEffect(() => {
    loadMedicine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicineId]);

  function handleAddBatch() {
    setBatchError(null);
    startSaveBatch(async () => {
      const result = await addBatch({
        medicineId,
        batchNumber,
        expiryDate,
        quantity: parseInt(batchQty) || 0,
      });
      if (!result.ok) {
        setBatchError(result.error);
        return;
      }
      setBatchDialogOpen(false);
      setBatchNumber("");
      setExpiryDate("");
      setBatchQty("");
      loadMedicine();
    });
  }

  function openAdjustDialog(batch: Batch) {
    setSelectedBatch(batch);
    setNewQty(String(batch.quantity));
    setReason("RECOUNT");
    setAdjustNotes("");
    setAdjustError(null);
    setAdjustDialogOpen(true);
  }

  function handleAdjust() {
    if (!selectedBatch) return;
    setAdjustError(null);
    startSaveAdjust(async () => {
      const result = await adjustStock({
        batchId: selectedBatch.id,
        newQty: parseInt(newQty) || 0,
        reason,
        notes: adjustNotes || undefined,
      });
      if (!result.ok) {
        setAdjustError(result.error);
        return;
      }
      setAdjustDialogOpen(false);
      loadMedicine();
    });
  }

  function handleDeactivate() {
    startLoad(async () => {
      const result = await deactivateMedicine(medicineId);
      if (result.ok) {
        loadMedicine();
      }
    });
  }

  if (loading && !medicine) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error && !medicine) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
        <Link href="/admin/medicines">
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            Back to Medicines
          </Button>
        </Link>
      </div>
    );
  }

  if (!medicine) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/medicines">
            <Button variant="ghost" size="icon-sm" aria-label="Back">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {medicine.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {medicine.genericName}
              {medicine.manufacturer ? ` · ${medicine.manufacturer}` : ""}
              {medicine.category ? ` · ${medicine.category}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/medicines/${medicine.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="size-4" />
              Edit
            </Button>
          </Link>
          {medicine.active && (
            <Button variant="outline" size="sm" onClick={handleDeactivate}>
              <Ban className="size-4" />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Package className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {medicine.totalStock}
              </p>
              <p className="text-xs text-muted-foreground">Total Stock</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <IndianRupee className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                ₹{medicine.totalValue.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Value</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Layers className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {medicine.batches.length}
              </p>
              <p className="text-xs text-muted-foreground">Batches</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <AlertTriangle className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {medicine.reorderLevel}
              </p>
              <p className="text-xs text-muted-foreground">Reorder Level</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batches table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Batches (FEFO Order)
          </h2>
          <Button size="sm" onClick={() => setBatchDialogOpen(true)}>
            <Plus className="size-4" />
            Add Batch
          </Button>
        </div>

        {medicine.batches.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No batches yet. Click &ldquo;Add Batch&rdquo; to add stock.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 text-left font-medium">FEFO #</th>
                  <th className="py-2 text-left font-medium">Batch No.</th>
                  <th className="py-2 text-left font-medium">Expiry Date</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-left font-medium">Status</th>
                  <th className="py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicine.batches.map((batch) => (
                  <tr key={batch.id} className="border-b border-border/50">
                    <td className="py-3 pr-2 text-muted-foreground">
                      {batch.fefoOrder ? `#${batch.fefoOrder}` : "—"}
                    </td>
                    <td className="py-3 pr-2 font-medium text-foreground">
                      {batch.batchNumber}
                    </td>
                    <td className="py-3 pr-2 text-muted-foreground">
                      {formatDate(batch.expiryDate)}
                    </td>
                    <td className="py-3 pr-2 text-right text-foreground">
                      {batch.quantity}
                    </td>
                    <td className="py-3 pr-2">
                      {batchStatusBadge(batch.status)}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAdjustDialog(batch)}
                      >
                        Adjust Qty
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Batch Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Batch</DialogTitle>
            <DialogDescription>
              Add a new batch of {medicine.name} to inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="batch-no">Batch Number</Label>
              <Input
                id="batch-no"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="B-2024-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="batch-qty">Quantity Received</Label>
              <Input
                id="batch-qty"
                type="number"
                min={1}
                value={batchQty}
                onChange={(e) => setBatchQty(e.target.value)}
                placeholder="100"
              />
            </div>
            {batchError && (
              <p className="text-sm text-destructive">{batchError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBatch} disabled={savingBatch}>
              Add Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {selectedBatch && `Batch: ${selectedBatch.batchNumber}`}
              {selectedBatch && ` · Current qty: ${selectedBatch.quantity}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-qty">New Quantity</Label>
              <Input
                id="new-qty"
                type="number"
                min={0}
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select
                value={reason}
                onValueChange={(v) =>
                  setReason(v as "DAMAGE" | "RECOUNT" | "OTHER")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAMAGE">Damage</SelectItem>
                  <SelectItem value="RECOUNT">Recount</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adjust-notes">Notes (optional)</Label>
              <Textarea
                id="adjust-notes"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Reason for adjustment"
                rows={2}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Adjustments are logged with timestamp and user.
            </p>
            {adjustError && (
              <p className="text-sm text-destructive">{adjustError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdjustDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAdjust} disabled={savingAdjust}>
              Adjust
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
