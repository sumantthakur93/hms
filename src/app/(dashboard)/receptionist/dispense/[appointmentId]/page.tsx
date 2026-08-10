import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPrescriptionForAppointment } from "@/actions/pharmacy";
import { DispensePanel } from "@/components/pharmacy/dispense-panel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "@/components/ui/icon";

export default async function DispensePage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "RECEPTIONIST") {
    redirect("/receptionist");
  }

  const { appointmentId } = await params;
  const result = await getPrescriptionForAppointment(appointmentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/receptionist/appointments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Package className="size-6 text-primary" />
            Dispense Prescription
          </h1>
          <p className="text-sm text-muted-foreground">
            Review the FEFO plan and dispense medicines
          </p>
        </div>
      </div>

      {!result.ok ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
          {result.error}
          <div className="mt-3">
            <Link href="/receptionist/appointments">
              <Button variant="outline" size="sm">
                Back to Appointments
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {result.patientName}
                </p>
                <p className="text-xs text-muted-foreground">
                  MRN: {result.patientMrn} · {result.itemCount} item(s)
                </p>
              </div>
              {result.allDispensed && (
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
                  All items dispensed
                </span>
              )}
            </div>
          </div>

          <DispensePanel
            prescriptionId={result.prescriptionId}
            onDispensed={() => {}}
          />

          {result.allDispensed && (
            <div className="flex justify-end">
              <Link href="/receptionist/billing">
                <Button>
                  Generate Invoice
                </Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
