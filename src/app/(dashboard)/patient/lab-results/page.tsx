import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyLabResults } from "@/actions/lab";
import { LabResultsList } from "@/components/patient/lab-results-list";
import { TestTube } from "@/components/ui/icon";

export default async function MyLabResultsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    redirect("/");
  }

  const result = await getMyLabResults();
  const labOrders = result.ok ? result.labOrders : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TestTube className="size-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">My Lab Results</h1>
      </div>
      <LabResultsList labOrders={labOrders} />
    </div>
  );
}
