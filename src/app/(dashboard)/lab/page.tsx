import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLabDashboardData } from "@/actions/dashboards";
import { LabDashboard } from "@/components/dashboard/lab-dashboard";

export default async function LabDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LAB_TECHNICIAN") {
    redirect("/");
  }

  const data = await getLabDashboardData();
  if (!data.ok) redirect("/lab");

  return <LabDashboard data={data} />;
}
