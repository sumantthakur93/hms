import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyAppointments } from "@/actions/appointments";
import { AppointmentList } from "@/components/patient/appointment-list";
import { CalendarClock } from "@/components/ui/icon";

export default async function MyAppointmentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    redirect("/");
  }

  const result = await getMyAppointments();
  const appointments = result.ok ? result.appointments : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">My Appointments</h1>
      </div>
      <AppointmentList appointments={appointments} />
    </div>
  );
}
