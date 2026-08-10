import { redirect } from "next/navigation";
import { getDoctor } from "@/actions/schedule";
import { DoctorDetail } from "@/components/admin/doctor-detail";

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ doctorId: string }>;
}) {
  const { doctorId } = await params;
  const doctor = await getDoctor(doctorId);

  if (!doctor) {
    redirect("/admin/doctors");
  }

  return <DoctorDetail doctor={doctor} />;
}
