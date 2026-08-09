"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Loader2,
  Package,
  AlertTriangle,
} from "@/components/ui/icon";
import { previewDispense, dispensePrescription } from "@/actions/pharmacy";

type PlanItem = {
  itemId: string;
  medicineName: string;
  needed: number;
  allocations: Array<{
    batchId: string;
    batchNumber: string;
    expiryDate: Date;
    qty: number;
  }>;
  insufficient: boolean;
  dispensed: boolean;
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DispensePanel({
  prescriptionId,
  onDispensed,
}: {
  prescriptionId: string;
  onDispensed?: () => void;
}) {
  const [loading, startLoad] = useTransition();
  const [dispensing, startDispense] = useTransition();
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  function loadPlan() {
    setError(null);
    startLoad(async () => {
      const result = await previewDispense(prescriptionId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPlan(result.plan as PlanItem[]);
      setLoaded(true);
    });
  }

  function handleDispense() {
    setError(null);
    startDispense(async () => {
      const result = await dispensePrescription({ prescriptionId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDispensed?.();
      loadPlan();
    });
  }

  const allDispensed = plan.length > 0 && plan.every((p) => p.dispensed);
  const hasInsufficient = plan.some((p) => p.insufficient);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Package className="size-4" />
            Dispensing (FEFO)
          </h3>
          {!loaded && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadPlan}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Preview Plan"
              )}
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {allDispensed && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
            <CheckCircle2 className="size-4" />
            All items dispensed
          </div>
        )}

        {plan.length > 0 && !allDispensed && (
          <>
            <div className="space-y-3">
              {plan.map((item) => (
                <div
                  key={item.itemId}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.medicineName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Needed: {item.needed}
                      </p>
                    </div>
                    {item.dispensed ? (
                      <Badge variant="default">Dispensed</Badge>
                    ) : item.insufficient ? (
                      <Badge variant="destructive">Insufficient</Badge>
                    ) : (
                      <Badge variant="secondary">Available</Badge>
                    )}
                  </div>

                  {!item.dispensed && item.allocations.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {item.allocations.map((alloc, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs text-muted-foreground"
                        >
                          <span>
                            Batch {alloc.batchNumber} · Exp:{" "}
                            {formatDate(alloc.expiryDate)}
                          </span>
                          <span className="font-medium text-foreground">
                            Take: {alloc.qty}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!item.dispensed && item.allocations.length === 0 && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="size-3" />
                      No valid batches available
                    </p>
                  )}
                </div>
              ))}
            </div>

            {!hasInsufficient && (
              <Button
                onClick={handleDispense}
                disabled={dispensing}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {dispensing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Dispense All
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
