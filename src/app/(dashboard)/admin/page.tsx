import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAdminDashboardData } from "@/actions/dashboards";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const data = await getAdminDashboardData();
  if (!data.ok) redirect("/admin");

  return <AdminDashboard data={data} />;
}
