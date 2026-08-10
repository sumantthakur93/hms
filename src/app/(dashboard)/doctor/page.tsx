import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getDoctorDashboardData } from "@/actions/dashboards";
import { DoctorDashboard } from "@/components/dashboard/doctor-dashboard";

export default async function DoctorDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOCTOR") {
    redirect("/");
  }

  const data = await getDoctorDashboardData();
  if (!data.ok) redirect("/doctor");

  return <DoctorDashboard data={data} />;
}
