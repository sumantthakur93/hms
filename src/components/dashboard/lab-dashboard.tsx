import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ListTodo,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from "@/components/ui/icon";
import { priorityBadge } from "@/components/ui/status-badges";
import { getLabDashboardData } from "@/actions/dashboards";

type Data = Extract<
  Awaited<ReturnType<typeof getLabDashboardData>>,
  { ok: true }
>;

function formatTime(d: Date): string {
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: accent }}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function LabDashboard({ data }: { data: Data }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Lab Technician Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Test queue and results</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending Tests"
          value={data.stats.pendingTests}
          icon={ListTodo}
          accent="#f59e0b"
        />
        <StatCard
          label="In Progress"
          value={data.stats.inProgress}
          icon={Loader2}
          accent="#3b82f6"
        />
        <StatCard
          label="Completed Today"
          value={data.stats.completedToday}
          icon={CheckCircle2}
          accent="#22c55e"
        />
      </div>

      {/* Test Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Test Queue</CardTitle>
            <Link href="/lab/queue">
              <Button size="sm" variant="ghost">
                View All
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.testQueue.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tests in queue
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 text-left font-medium">Patient</th>
                    <th className="py-2 text-left font-medium">Test</th>
                    <th className="py-2 text-left font-medium">Priority</th>
                    <th className="py-2 text-left font-medium">Ordered</th>
                    <th className="py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.testQueue.map((o) => (
                    <tr key={o.id} className="border-b border-border/50">
                      <td className="py-3 pr-2">
                        <p className="font-medium text-foreground">
                          {o.patientName}
                        </p>
                        <p className="text-xs text-muted-foreground">{o.mrn}</p>
                      </td>
                      <td className="py-3 pr-2 text-foreground">
                        {o.testName}
                      </td>
                      <td className="py-3 pr-2">{priorityBadge(o.priority)}</td>
                      <td className="py-3 pr-2 text-xs text-muted-foreground">
                        {formatTime(o.createdAt)}
                      </td>
                      <td className="py-3 text-right">
                        <Link href={`/lab/results/${o.id}`}>
                          <Button size="sm" variant="outline">
                            {o.status === "ORDERED"
                              ? "Collect Sample"
                              : "Enter Results"}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
