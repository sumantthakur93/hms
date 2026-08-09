import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BookOnBehalf } from "@/components/receptionist/book-on-behalf";
import { CalendarPlus } from "@/components/ui/icon";

export default async function BookOnBehalfPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "RECEPTIONIST") {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarPlus className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">
          Book Appointment
        </h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Search for an existing patient or register a walk-in, then book their
        appointment.
      </p>
      <BookOnBehalf />
    </div>
  );
}
