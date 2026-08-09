import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTodaysAppointments } from "@/actions/appointments";
import { TodaysAppointments } from "@/components/receptionist/todays-appointments";
import { CalendarClock } from "@/components/ui/icon";

export default async function TodaysAppointmentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "RECEPTIONIST") {
    redirect("/admin");
  }

  const result = await getTodaysAppointments();
  const appointments = result.ok ? result.appointments : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">
          Today&rsquo;s Appointments
        </h1>
      </div>
      <TodaysAppointments appointments={appointments} />
    </div>
  );
}
