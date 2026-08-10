import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  CalendarClock,
  Users,
  TestTube,
  Stethoscope,
} from "@/components/ui/icon";
import { getDoctorDashboardData } from "@/actions/dashboards";

type Data = Extract<
  Awaited<ReturnType<typeof getDoctorDashboardData>>,
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

export function DoctorDashboard({ data }: { data: Data }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Doctor Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your schedule and patients
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Today's Appointments"
          value={data.stats.todaysAppointments}
          icon={CalendarClock}
          accent="#3b82f6"
        />
        <StatCard
          label="Patients Seen Today"
          value={data.stats.patientsSeenToday}
          icon={Users}
          accent="#14b8a6"
        />
        <StatCard
          label="Pending Lab Results"
          value={data.stats.pendingLabResults}
          icon={TestTube}
          accent="#f59e0b"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Schedule */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Today&apos;s Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {data.todaysAppointments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No appointments today
                </p>
              ) : (
                <div className="space-y-3">
                  {data.todaysAppointments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between border-b border-border/50 pb-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-foreground">
                          {formatTime(a.startTime)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {a.patientName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {a.mrn}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {apptStatusBadge(a.status)}
                        {a.status === "CHECKED_IN" && (
                          <Link href={`/doctor/consultation/${a.id}`}>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Stethoscope className="size-4" />
                              Start Consultation
                            </Button>
                          </Link>
                        )}
                        {a.status === "COMPLETED" && (
                          <Link href={`/doctor/consultation/${a.id}`}>
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {data.upcomingAppointments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No upcoming
                </p>
              ) : (
                <div className="space-y-2">
                  {data.upcomingAppointments.map((a) => (
                    <div key={a.id} className="text-sm">
                      <p className="font-medium text-foreground">
                        {a.patientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(a.date)} · {formatTime(a.startTime)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Patients</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentPatients.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No patients yet
                </p>
              ) : (
                <div className="space-y-2">
                  {data.recentPatients.map((p) => (
                    <div key={p.id} className="text-sm">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.mrn}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
