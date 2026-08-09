"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Pill } from "@/components/ui/icon";
import { savePrescription, getActiveMedicines } from "@/actions/consultations";

type Medicine = {
  id: string;
  name: string;
  genericName: string;
  category: string | null;
};

type PrescriptionItem = {
  id?: string;
  medicineId: string;
  dosage: string;
  frequency: "OD" | "BD" | "TDS" | "QID";
  duration: string;
  instructions: string;
  quantity: number;
};

type ExistingItem = {
  id: string;
  medicineId: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
  quantity: number;
  medicine: { name: string };
};

export function PrescriptionSheet({
  open,
  onOpenChange,
  consultationId,
  existingItems,
  locked,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultationId: string;
  existingItems?: ExistingItem[];
  locked?: boolean;
  onSaved?: () => void;
}) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      getActiveMedicines().then((res) => {
        if (res.ok) setMedicines(res.medicines);
      });
      if (existingItems && existingItems.length > 0) {
        setItems(
          existingItems.map((item) => ({
            id: item.id,
            medicineId: item.medicineId,
            dosage: item.dosage,
            frequency: item.frequency as "OD" | "BD" | "TDS" | "QID",
            duration: item.duration,
            instructions: item.instructions ?? "",
            quantity: item.quantity,
          })),
        );
      }
    }
  }, [open, existingItems]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        medicineId: "",
        dosage: "",
        frequency: "OD",
        duration: "",
        instructions: "",
        quantity: 1,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(
    index: number,
    field: keyof PrescriptionItem,
    value: string | number,
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function handleSave() {
    setError(null);
    if (items.length === 0) {
      setError("Add at least one medicine");
      return;
    }
    for (const item of items) {
      if (!item.medicineId || !item.dosage || !item.duration) {
        setError("All items need medicine, dosage, and duration");
        return;
      }
    }

    startSave(async () => {
      const result = await savePrescription({ consultationId, items });
      if (result.ok) {
        onSaved?.();
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Pill className="size-5" />
            Prescription
          </SheetTitle>
          <SheetDescription>
            Add medicines to prescribe to the patient.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {locked && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
              Prescription is locked — some items have been dispensed or the 24h
              edit window has passed.
            </p>
          )}

          {items.map((item, index) => (
            <div
              key={index}
              className="space-y-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Item {index + 1}
                </span>
                {!locked && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeItem(index)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`med-${index}`}>Medicine</Label>
                <Select
                  value={item.medicineId}
                  onValueChange={(v) =>
                    updateItem(index, "medicineId", v ?? "")
                  }
                  disabled={locked}
                >
                  <SelectTrigger id={`med-${index}`}>
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicines.map((med) => (
                      <SelectItem key={med.id} value={med.id}>
                        {med.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`dose-${index}`}>Dosage</Label>
                  <Input
                    id={`dose-${index}`}
                    value={item.dosage}
                    onChange={(e) =>
                      updateItem(index, "dosage", e.target.value)
                    }
                    placeholder="1 tablet"
                    disabled={locked}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`freq-${index}`}>Frequency</Label>
                  <Select
                    value={item.frequency}
                    onValueChange={(v) =>
                      updateItem(
                        index,
                        "frequency",
                        v as PrescriptionItem["frequency"],
                      )
                    }
                    disabled={locked}
                  >
                    <SelectTrigger id={`freq-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OD">OD (once daily)</SelectItem>
                      <SelectItem value="BD">BD (twice daily)</SelectItem>
                      <SelectItem value="TDS">TDS (3x daily)</SelectItem>
                      <SelectItem value="QID">QID (4x daily)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`dur-${index}`}>Duration</Label>
                  <Input
                    id={`dur-${index}`}
                    value={item.duration}
                    onChange={(e) =>
                      updateItem(index, "duration", e.target.value)
                    }
                    placeholder="5 days"
                    disabled={locked}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`qty-${index}`}>Quantity</Label>
                  <Input
                    id={`qty-${index}`}
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(
                        index,
                        "quantity",
                        parseInt(e.target.value) || 1,
                      )
                    }
                    disabled={locked}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`instr-${index}`}>Instructions</Label>
                <Textarea
                  id={`instr-${index}`}
                  value={item.instructions}
                  onChange={(e) =>
                    updateItem(index, "instructions", e.target.value)
                  }
                  placeholder="Take after meals"
                  rows={2}
                  disabled={locked}
                />
              </div>
            </div>
          ))}

          {!locked && (
            <Button variant="outline" className="w-full" onClick={addItem}>
              <Plus className="size-4" />
              Add Item
            </Button>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
          <Button
            onClick={handleSave}
            disabled={saving || locked}
            className="w-full"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save Prescription
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
