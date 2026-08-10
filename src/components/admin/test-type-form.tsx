"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "@/components/ui/icon";
import {
  createTestType,
  updateTestType,
  type TestTypeInput,
} from "@/actions/lab";

type TestTypeFormProps = {
  mode: "create" | "edit";
  testTypeId?: string;
  initialData?: {
    name: string;
    code: string;
    category: string;
    price: number;
    description: string | null;
  };
};

export function TestTypeForm({
  mode,
  testTypeId,
  initialData,
}: TestTypeFormProps) {
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState<TestTypeInput>({
    name: initialData?.name ?? "",
    code: initialData?.code ?? "",
    category: initialData?.category ?? "",
    price: initialData?.price ?? 0,
    description: initialData?.description ?? "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startSave(async () => {
      if (mode === "create") {
        const result = await createTestType(form);
        if (result.ok) {
          router.push("/admin/test-types");
        } else {
          setError(result.error);
        }
      } else if (mode === "edit" && testTypeId) {
        const result = await updateTestType(testTypeId, form);
        if (result.ok) {
          router.push("/admin/test-types");
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
          onClick={() => router.push("/admin/test-types")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "create" ? "Add Test Type" : "Edit Test Type"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "create"
              ? "Create a new lab test type for the catalog"
              : "Update test type details"}
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
            placeholder="e.g., Complete Blood Count"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="e.g., CBC"
            required
          />
          <p className="text-xs text-muted-foreground">
            Short unique code used on lab orders and reports.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="e.g., Hematology"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Price (₹)</Label>
          <Input
            id="price"
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: parseFloat(e.target.value) || 0 })
            }
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
            placeholder="Optional description of the test"
            rows={3}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : mode === "create"
                ? "Create Test Type"
                : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/test-types")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
