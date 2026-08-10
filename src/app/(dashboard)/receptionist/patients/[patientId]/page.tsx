import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPatientProfile } from "@/actions/patient-profile";
import { PatientProfile } from "@/components/patient/patient-profile";

export default async function ReceptionistPatientProfilePage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "RECEPTIONIST") redirect("/");

  const { patientId } = await params;
  const data = await getPatientProfile(patientId);
  if (!data.ok) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Patient Not Found</h1>
        <p className="text-sm text-destructive">{data.error}</p>
      </div>
    );
  }

  return <PatientProfile data={data} role="RECEPTIONIST" />;
}
