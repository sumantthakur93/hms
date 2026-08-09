import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BookingWizard } from "@/components/patient/booking-wizard";
import { CalendarPlus } from "@/components/ui/icon";

export default async function BookAppointmentPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarPlus className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Book Appointment</h1>
      </div>
      <BookingWizard />
    </div>
  );
}
