"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "@/components/ui/icon";
import { updateMedicine } from "@/actions/pharmacy";

type MedicineFormProps = {
  medicineId: string;
  initialData: {
    name: string;
    genericName: string;
    manufacturer: string | null;
    category: string | null;
    unitPrice: number;
    reorderLevel: number;
  };
};

export function MedicineForm({ medicineId, initialData }: MedicineFormProps) {
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: initialData.name,
    genericName: initialData.genericName,
    manufacturer: initialData.manufacturer ?? "",
    category: initialData.category ?? "",
    unitPrice: initialData.unitPrice,
    reorderLevel: initialData.reorderLevel,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startSave(async () => {
      const result = await updateMedicine(medicineId, {
        name: form.name,
        genericName: form.genericName,
        manufacturer: form.manufacturer || undefined,
        category: form.category || undefined,
        unitPrice: form.unitPrice,
        reorderLevel: form.reorderLevel,
      });
      if (result.ok) {
        router.push(`/admin/medicines/${medicineId}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/admin/medicines/${medicineId}`)}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Medicine</h1>
          <p className="text-sm text-muted-foreground">
            Update medicine details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Paracetamol 500mg"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="genericName">Generic Name</Label>
          <Input
            id="genericName"
            value={form.genericName}
            onChange={(e) => setForm({ ...form, genericName: e.target.value })}
            placeholder="e.g., Acetaminophen"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manufacturer">Manufacturer</Label>
          <Input
            id="manufacturer"
            value={form.manufacturer}
            onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
            placeholder="e.g., Cipla"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="e.g., Analgesic"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unitPrice">Unit Price (₹)</Label>
          <Input
            id="unitPrice"
            type="number"
            min={0}
            step="0.01"
            value={form.unitPrice}
            onChange={(e) =>
              setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reorderLevel">Reorder Level</Label>
          <Input
            id="reorderLevel"
            type="number"
            min={0}
            value={form.reorderLevel}
            onChange={(e) =>
              setForm({ ...form, reorderLevel: parseInt(e.target.value) || 0 })
            }
            required
          />
          <p className="text-xs text-muted-foreground">
            Stock is flagged as low when it falls to or below this level.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/admin/medicines/${medicineId}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
