"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TestTube, Clock, CheckCircle2, Activity } from "@/components/ui/icon";
import { getLabQueue, collectSample } from "@/actions/lab";

type Order = {
  id: string;
  status: string;
  priority: string;
  createdAt: Date;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    gender: string | null;
    dateOfBirth: Date | null;
  };
  testType: { name: string; code: string; category: string };
  result: { id: string } | null;
};

type Stats = {
  pending: number;
  inProgress: number;
  completedToday: number;
};

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "ORDERED":
      return "outline";
    case "SAMPLE_COLLECTED":
      return "default";
    case "PROCESSING":
      return "secondary";
    case "COMPLETED":
      return "outline";
    case "CANCELLED":
      return "destructive";
    default:
      return "outline";
  }
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LabQueue() {
  const router = useRouter();
  const [loading, startLoad] = useTransition();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, inProgress: 0, completedToday: 0 });
  const [filter, setFilter] = useState<string>("ALL");
  const [collecting, startCollect] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function loadQueue(statusFilter?: string) {
    startLoad(async () => {
      const result = await getLabQueue(statusFilter);
      if (result.ok) {
        setOrders(result.orders as Order[]);
        setStats(result.stats);
      }
    });
  }

  useEffect(() => {
    loadQueue();
  }, []);

  function handleFilter(newFilter: string) {
    setFilter(newFilter);
    loadQueue(newFilter);
  }

  function handleCollectSample(orderId: string) {
    setError(null);
    startCollect(async () => {
      const result = await collectSample(orderId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      loadQueue(filter);
    });
  }

  function actionButton(order: Order) {
    switch (order.status) {
      case "ORDERED":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCollectSample(order.id)}
            disabled={collecting}
          >
            <TestTube className="size-4" />
            Collect Sample
          </Button>
        );
      case "SAMPLE_COLLECTED":
      case "PROCESSING":
        return (
          <Button
            size="sm"
            onClick={() => router.push(`/lab/results/${order.id}`)}
          >
            <Activity className="size-4" />
            Enter Results
          </Button>
        );
      case "COMPLETED":
        return (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push(`/lab/results/${order.id}`)}
          >
            <CheckCircle2 className="size-4" />
            View
          </Button>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lab Test Queue</h1>
        <p className="text-sm text-muted-foreground">
          Internal lab tests sorted by priority and order time
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Clock className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Activity className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <CheckCircle2 className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.completedToday}</p>
              <p className="text-xs text-muted-foreground">Completed Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filter buttons */}
      <div className="flex gap-2">
        {["ALL", "ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "COMPLETED"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilter(f)}
          >
            {f === "ALL" ? "All" : f.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      {/* Queue table */}
      {loading && orders.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TestTube className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No tests in queue</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 flex-col items-center justify-center rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                    <TestTube className="size-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {order.patient.firstName} {order.patient.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      MRN: {order.patient.mrn} · {order.testType.name} ({order.testType.code})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ordered: {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {order.priority === "URGENT" && (
                    <Badge variant="destructive">Urgent</Badge>
                  )}
                  <Badge variant={statusBadgeVariant(order.status)}>
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                  {actionButton(order)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
