import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyMedicalHistory } from "@/actions/patient-profile";
import { MedicalHistory } from "@/components/patient/medical-history";
import { Activity } from "@/components/ui/icon";

export default async function MyHistoryPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    redirect("/");
  }

  const result = await getMyMedicalHistory();

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Activity className="size-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Medical History</h1>
        </div>
        <p className="text-sm text-muted-foreground">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Medical History</h1>
      </div>
      <MedicalHistory data={result} />
    </div>
  );
}
