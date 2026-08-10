"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "@/components/ui/icon";
import {
  createDepartment,
  updateDepartment,
  type DepartmentInput,
} from "@/actions/departments";

type DepartmentFormProps = {
  mode: "create" | "edit";
  departmentId?: string;
  initialData?: {
    name: string;
    description: string | null;
    consultationFee: number;
  };
};

export function DepartmentForm({
  mode,
  departmentId,
  initialData,
}: DepartmentFormProps) {
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState<DepartmentInput>({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    consultationFee: initialData?.consultationFee ?? 0,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startSave(async () => {
      if (mode === "create") {
        const result = await createDepartment(form);
        if (result.ok) {
          router.push("/admin/departments");
        } else {
          setError(result.error);
        }
      } else if (mode === "edit" && departmentId) {
        const result = await updateDepartment(departmentId, form);
        if (result.ok) {
          router.push("/admin/departments");
        } else {
          setError(result.error);
        }
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/departments")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "create" ? "Add Department" : "Edit Department"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "create"
              ? "Create a new hospital department"
              : "Update department details"}
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
            placeholder="e.g., Cardiology"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description ?? ""}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value || undefined })
            }
            placeholder="Optional description of the department"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="consultationFee">Consultation Fee (₹)</Label>
          <Input
            id="consultationFee"
            type="number"
            min={0}
            step="0.01"
            value={form.consultationFee}
            onChange={(e) =>
              setForm({ ...form, consultationFee: parseFloat(e.target.value) || 0 })
            }
            required
          />
          <p className="text-xs text-muted-foreground">
            Default fee charged when generating invoices for consultations in
            this department.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : mode === "create"
                ? "Create Department"
                : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/departments")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
