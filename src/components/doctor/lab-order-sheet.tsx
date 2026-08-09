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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, TestTube } from "@/components/ui/icon";
import { orderLabTest, getActiveTestTypes } from "@/actions/consultations";

type TestType = {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number;
};

type LabOrderInput = {
  testTypeId: string;
  priority: "NORMAL" | "URGENT";
  instructions: string;
};

export function LabOrderSheet({
  open,
  onOpenChange,
  consultationId,
  patientId,
  onOrdered,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consultationId: string;
  patientId: string;
  onOrdered?: () => void;
}) {
  const [testTypes, setTestTypes] = useState<TestType[]>([]);
  const [orders, setOrders] = useState<LabOrderInput[]>([]);
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      getActiveTestTypes().then((res) => {
        if (res.ok) setTestTypes(res.testTypes);
      });
      setOrders([{ testTypeId: "", priority: "NORMAL", instructions: "" }]);
    }
  }, [open]);

  function addOrder() {
    setOrders((prev) => [
      ...prev,
      { testTypeId: "", priority: "NORMAL", instructions: "" },
    ]);
  }

  function removeOrder(index: number) {
    setOrders((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOrder(
    index: number,
    field: keyof LabOrderInput,
    value: string,
  ) {
    setOrders((prev) =>
      prev.map((order, i) =>
        i === index ? { ...order, [field]: value } : order,
      ),
    );
  }

  async function handleSave() {
    setError(null);
    const valid = orders.filter((o) => o.testTypeId);
    if (valid.length === 0) {
      setError("Select at least one test");
      return;
    }

    startSave(async () => {
      for (const order of valid) {
        const result = await orderLabTest({
          consultationId,
          patientId,
          testTypeId: order.testTypeId,
          priority: order.priority,
          instructions: order.instructions || undefined,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      onOrdered?.();
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TestTube className="size-5" />
            Order Lab Tests
          </SheetTitle>
          <SheetDescription>
            Select tests to order for this patient.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {orders.map((order, index) => (
            <div
              key={index}
              className="space-y-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Test {index + 1}
                </span>
                {orders.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeOrder(index)}
                    aria-label="Remove test"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`tt-${index}`}>Test Type</Label>
                <Select
                  value={order.testTypeId}
                  onValueChange={(v) =>
                    updateOrder(index, "testTypeId", v ?? "")
                  }
                >
                  <SelectTrigger id={`tt-${index}`}>
                    <SelectValue placeholder="Select test" />
                  </SelectTrigger>
                  <SelectContent>
                    {testTypes.map((tt) => (
                      <SelectItem key={tt.id} value={tt.id}>
                        {tt.name} ({tt.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {order.testTypeId && (
                  <Badge variant="secondary" className="mt-1">
                    {testTypes.find((t) => t.id === order.testTypeId)?.category}
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`prio-${index}`}>Priority</Label>
                <Select
                  value={order.priority}
                  onValueChange={(v) =>
                    updateOrder(index, "priority", v as "NORMAL" | "URGENT")
                  }
                >
                  <SelectTrigger id={`prio-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`instr-${index}`}>
                  Instructions (optional)
                </Label>
                <Textarea
                  id={`instr-${index}`}
                  value={order.instructions}
                  onChange={(e) =>
                    updateOrder(index, "instructions", e.target.value)
                  }
                  placeholder="Fasting sample required"
                  rows={2}
                />
              </div>
            </div>
          ))}

          <Button variant="outline" className="w-full" onClick={addOrder}>
            <Plus className="size-4" />
            Add Test
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Order Tests
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
