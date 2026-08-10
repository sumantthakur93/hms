import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  CalendarClock,
  UserCheck,
  Clock,
  CheckCircle2,
} from "@/components/ui/icon";
import { getReceptionistDashboardData } from "@/actions/dashboards";

type Data = Extract<
  Awaited<ReturnType<typeof getReceptionistDashboardData>>,
  { ok: true }
>;

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

function invStatusBadge(status: string) {
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

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
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

export function ReceptionistDashboardStats({ data }: { data: Data }) {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today's Total"
          value={data.stats.todaysTotal}
          icon={CalendarClock}
          accent="#3b82f6"
        />
        <StatCard
          label="Checked In"
          value={data.stats.checkedIn}
          icon={UserCheck}
          accent="#14b8a6"
        />
        <StatCard
          label="Waiting"
          value={data.stats.waiting}
          icon={Clock}
          accent="#f59e0b"
        />
        <StatCard
          label="Completed"
          value={data.stats.completed}
          icon={CheckCircle2}
          accent="#22c55e"
        />
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Today&apos;s Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {data.todaysAppointments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No appointments today
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 text-left font-medium">Time</th>
                    <th className="py-2 text-left font-medium">Patient</th>
                    <th className="py-2 text-left font-medium">Doctor</th>
                    <th className="py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.todaysAppointments.map((a) => (
                    <tr key={a.id} className="border-b border-border/50">
                      <td className="py-3 pr-2 text-foreground">
                        {formatTime(a.startTime)}
                      </td>
                      <td className="py-3 pr-2">
                        <p className="font-medium text-foreground">
                          {a.patientName}
                        </p>
                        <p className="text-xs text-muted-foreground">{a.mrn}</p>
                      </td>
                      <td className="py-3 pr-2 text-muted-foreground">
                        {a.doctorName}
                      </td>
                      <td className="py-3 pr-2">{apptStatusBadge(a.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              {data.recentInvoices.map((inv) => (
                <Link key={inv.id} href={`/receptionist/billing/${inv.id}`}>
                  <div className="flex items-center justify-between text-sm hover:bg-muted/50 -mx-2 rounded px-2 py-1.5">
                    <div>
                      <p className="font-medium text-foreground">
                        {inv.invoiceNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {inv.patientName} · {formatDate(inv.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        ₹{inv.totalAmount.toFixed(0)}
                      </span>
                      {invStatusBadge(inv.status)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
