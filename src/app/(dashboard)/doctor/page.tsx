import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarClock } from "@/components/ui/icon";

export default function DoctorDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Doctor Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          View your appointments and start consultations.
        </p>
      </div>

      <div className="flex gap-3">
        <Link href="/doctor/appointments">
          <Button>
            <CalendarClock className="size-4" />
            Today&apos;s Appointments
          </Button>
        </Link>
      </div>
    </div>
  );
}
