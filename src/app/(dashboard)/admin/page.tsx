import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getDoctors } from "@/actions/schedule";
import { DoctorScheduleManager } from "@/components/admin/doctor-schedule-manager";
import { Calendar } from "lucide-react";

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
          <Calendar className="size-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-100">
            Doctor Schedule Management
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Manage schedule blocks and blocked dates for each doctor
        </p>
      </div>

      <DoctorScheduleManager doctors={doctors} />
    </div>
  );
}
