import { prisma } from "@/lib/prisma";
import { DoctorForm } from "@/components/admin/doctor-form";

export default async function NewDoctorPage() {
  // Find users with DOCTOR role who don't have a doctor profile yet
  const users = await prisma.user.findMany({
    where: {
      role: "DOCTOR",
      doctorProfile: null,
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const availableUsers = users.map((u) => ({
    id: u.id,
    name: u.name ?? "Unknown",
    email: u.email ?? "",
  }));

  return <DoctorForm mode="create" availableUsers={availableUsers} />;
}
