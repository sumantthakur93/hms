"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "@/components/ui/icon";
import { getCompletedTests } from "@/actions/lab";

type Order = {
  id: string;
  updatedAt: Date;
  patient: { mrn: string; firstName: string; lastName: string };
  testType: { name: string; code: string };
  result: { id: string; notes: string | null } | null;
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CompletedTests() {
  const router = useRouter();
  const [loading, startLoad] = useTransition();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    startLoad(async () => {
      const result = await getCompletedTests();
      if (result.ok) {
        setOrders(result.orders as Order[]);
      }
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Completed Tests</h1>
        <p className="text-sm text-muted-foreground">
          Recently completed lab tests
        </p>
      </div>

      {loading && orders.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </p>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No completed tests
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-foreground">
                    {order.patient.firstName} {order.patient.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    MRN: {order.patient.mrn} · {order.testType.name} (
                    {order.testType.code})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Completed: {formatDate(order.updatedAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push(`/lab/results/${order.id}`)}
                >
                  View
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
