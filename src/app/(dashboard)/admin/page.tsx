import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getDoctors } from "@/actions/schedule";
import { DoctorScheduleManager } from "@/components/admin/doctor-schedule-manager";
import { CalendarDots } from "@/components/ui/icon";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const doctors = await getDoctors();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <CalendarDots className="size-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">
            Doctor Schedule Management
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage schedule blocks and blocked dates for each doctor
        </p>
      </div>

      <Suspense fallback={null}>
        <DoctorScheduleManager doctors={doctors} />
      </Suspense>
    </div>
  );
}
