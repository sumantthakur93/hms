import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getReceptionistDashboardData } from "@/actions/dashboards";
import { ReceptionistDashboardStats } from "@/components/dashboard/receptionist-dashboard";
import { UserPlus, CalendarPlus } from "@/components/ui/icon";

export default async function ReceptionistDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "RECEPTIONIST") {
    redirect("/admin");
  }

  const dashboardData = await getReceptionistDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Receptionist Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Today&apos;s summary and quick actions
        </p>
      </div>

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/receptionist/patients"
          className="inline-flex h-9 items-center gap-1.5 rounded-4xl bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          <UserPlus className="size-4" />
          Register Patient
        </Link>
        <Link
          href="/receptionist/book"
          className="inline-flex h-9 items-center gap-1.5 rounded-4xl border border-border bg-background px-3 text-sm font-medium hover:bg-muted hover:text-foreground"
        >
          <CalendarPlus className="size-4" />
          Book Appointment
        </Link>
      </div>

      {/* Dashboard stats + today's appointments + recent invoices */}
      {dashboardData.ok && <ReceptionistDashboardStats data={dashboardData} />}
    </div>
  );
}
