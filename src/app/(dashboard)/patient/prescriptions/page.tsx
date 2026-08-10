import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyPrescriptions } from "@/actions/consultations";
import { PrescriptionsList } from "@/components/patient/prescriptions-list";
import { Pill } from "@/components/ui/icon";

export default async function MyPrescriptionsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    redirect("/");
  }

  const result = await getMyPrescriptions();
  const prescriptions = result.ok ? result.prescriptions : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Pill className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">My Prescriptions</h1>
      </div>
      <PrescriptionsList prescriptions={prescriptions} />
    </div>
  );
}
