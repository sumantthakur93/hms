import { auth } from "@/auth";
import { siteConfig } from "@/lib/site-config";
import { NAV_PER_ROLE } from "@/components/dashboard/nav-config";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ChatButton } from "@/components/chat/chat-button";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  DOCTOR: "Doctor",
  PATIENT: "Patient",
  RECEPTIONIST: "Receptionist",
  LAB_TECHNICIAN: "Lab Technician",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role ?? "PATIENT";
  const navItems = NAV_PER_ROLE[role] ?? NAV_PER_ROLE.PATIENT;
  const roleLabel = ROLE_LABELS[role] ?? "User";
  const brandName = (siteConfig.name ?? "CarePoint").split(" ")[0];

  return (
    <DashboardShell
      navItems={navItems}
      brand={brandName}
      roleLabel={roleLabel}
      userName={session?.user?.name ?? roleLabel}
      userEmail={session?.user?.email ?? ""}
    >
      {children}
      {session?.user && <ChatButton role={role} userId={session.user.id} />}
    </DashboardShell>
  );
}
