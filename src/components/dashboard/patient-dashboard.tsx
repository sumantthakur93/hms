import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  CalendarPlus,
  CalendarClock,
  FileText,
  TestTube,
  MessageSquare,
  Stethoscope,
} from "@/components/ui/icon";
import { getPatientDashboardData } from "@/actions/dashboards";

type Data = Extract<Awaited<ReturnType<typeof getPatientDashboardData>>, { ok: true }>;

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const ACTIVITY_ICONS = {
  APPOINTMENT: CalendarClock,
  PRESCRIPTION: FileText,
  LAB_RESULT: TestTube,
} as const;

export function PatientDashboard({ data }: { data: Data }) {
  return (
    <div className="space-y-6">
      {/* Greeting banner */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {data.patientName}</h1>
          <p className="text-sm text-muted-foreground">Manage your health and appointments</p>
        </div>
        <Link href="/patient/book">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Stethoscope className="size-4" />
            Book Appointment
          </Button>
        </Link>
      </div>

      {/* Top row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Next Appointment */}
        <Card className="sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Next Appointment</p>
            {data.nextAppointment ? (
              <div className="mt-2">
                <p className="text-lg font-bold text-foreground">{formatDate(data.nextAppointment.date)}</p>
                <p className="text-sm text-muted-foreground">{formatTime(data.nextAppointment.startTime)}</p>
                <p className="text-sm text-foreground">Dr. {data.nextAppointment.doctorName}</p>
                <p className="text-xs text-muted-foreground">{data.nextAppointment.department}</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No upcoming appointment</p>
            )}
          </CardContent>
        </Card>

        {/* Active Prescriptions */}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{data.stats.activePrescriptions}</p>
              <p className="text-xs text-muted-foreground">Active Prescriptions</p>
            </div>
          </CardContent>
        </Card>

        {/* Pending Lab Results */}
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <TestTube className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{data.stats.pendingLabResults}</p>
              <p className="text-xs text-muted-foreground">Pending Lab Results</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data.activities.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {data.activities.map((act, i) => {
                const Icon = ACTIVITY_ICONS[act.type];
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{act.title}</p>
                      <p className="text-xs text-muted-foreground">{act.subtitle}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(act.date)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Link href="/patient/book">
          <Card className="cursor-pointer hover:bg-muted/50">
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <CalendarPlus className="size-6 text-primary" />
              <span className="text-xs text-foreground">Book Appointment</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/patient/appointments">
          <Card className="cursor-pointer hover:bg-muted/50">
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <CalendarClock className="size-6 text-primary" />
              <span className="text-xs text-foreground">My Appointments</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/patient/lab-results">
          <Card className="cursor-pointer hover:bg-muted/50">
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <TestTube className="size-6 text-primary" />
              <span className="text-xs text-foreground">Lab Results</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/patient/chat">
          <Card className="cursor-pointer hover:bg-muted/50">
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <MessageSquare className="size-6 text-primary" />
              <span className="text-xs text-foreground">Chat with AI</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
