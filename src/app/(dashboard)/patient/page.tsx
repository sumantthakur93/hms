import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getPatientDashboardData } from "@/actions/dashboards";
import { PatientDashboard } from "@/components/dashboard/patient-dashboard";

export default async function PatientDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    redirect("/");
  }

  const data = await getPatientDashboardData();
  if (!data.ok) redirect("/patient");

  return <PatientDashboard data={data} />;
}
