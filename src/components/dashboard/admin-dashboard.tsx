import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  CalendarClock,
  Stethoscope,
  Receipt,
  IndianRupee,
  AlertTriangle,
} from "@/components/ui/icon";

type Data = Awaited<ReturnType<typeof getAdminDashboardData>>;
type RecentAppointment = Extract<
  Data,
  { ok: true }
>["recentAppointments"][number];
type LowStockItem = Extract<Data, { ok: true }>["lowStock"][number];
type Department = Extract<Data, { ok: true }>["departments"][number];
type RecentInvoice = Extract<Data, { ok: true }>["recentInvoices"][number];

import { getAdminDashboardData } from "@/actions/dashboards";

function statusBadge(status: string) {
  const variant: "default" | "secondary" | "outline" | "destructive" =
    status === "PAID"
      ? "default"
      : status === "ISSUED"
        ? "secondary"
        : status === "CANCELLED"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

function apptStatusBadge(status: string) {
  const variant: "default" | "secondary" | "outline" | "destructive" =
    status === "COMPLETED"
      ? "default"
      : status === "CHECKED_IN"
        ? "secondary"
        : status === "CANCELLED"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
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

export function AdminDashboard({
  data,
}: {
  data: Extract<Data, { ok: true }>;
}) {
  const maxDeptCount = Math.max(...data.departments.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Hospital overview and operations
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Patients"
          value={data.stats.totalPatients}
          icon={Users}
          accent="#3b82f6"
        />
        <StatCard
          label="Today's Appointments"
          value={data.stats.todaysAppointments}
          icon={CalendarClock}
          accent="#14b8a6"
        />
        <StatCard
          label="Active Doctors"
          value={data.stats.activeDoctors}
          icon={Stethoscope}
          accent="#8b5cf6"
        />
        <StatCard
          label="Pending Invoices"
          value={data.stats.pendingInvoices}
          icon={Receipt}
          accent="#f59e0b"
        />
      </div>

      {/* Revenue */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-500/10">
            <IndianRupee className="size-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">
              ₹{data.stats.todayRevenue.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              Today&apos;s Revenue
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentAppointments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No appointments yet
              </p>
            ) : (
              <div className="space-y-2">
                {data.recentAppointments.map((a: RecentAppointment) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {a.patientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.doctorName} · {a.department}
                      </p>
                    </div>
                    {apptStatusBadge(a.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                All medicines well stocked
              </p>
            ) : (
              <div className="space-y-2">
                {data.lowStock.map((m: LowStockItem) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Reorder at: {m.reorderLevel}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-500">
                        {m.totalStock}
                      </span>
                      <Link href={`/admin/medicines/${m.id}`}>
                        <Button size="sm" variant="outline">
                          Restock
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Department Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {data.departments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No data yet
              </p>
            ) : (
              <div className="space-y-2">
                {data.departments.map((d: Department) => (
                  <div key={d.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">{d.name}</span>
                      <span className="text-muted-foreground">{d.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(d.count / maxDeptCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentInvoices.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No invoices yet
              </p>
            ) : (
              <div className="space-y-2">
                {data.recentInvoices.map((inv: RecentInvoice) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {inv.patientName} · {formatDate(inv.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        ₹{inv.totalAmount.toFixed(0)}
                      </span>
                      {statusBadge(inv.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
