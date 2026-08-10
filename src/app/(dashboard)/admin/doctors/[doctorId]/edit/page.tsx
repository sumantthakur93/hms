import { redirect } from "next/navigation";
import { getDoctor } from "@/actions/schedule";
import { DoctorForm } from "@/components/admin/doctor-form";

export default async function EditDoctorPage({
  params,
}: {
  params: Promise<{ doctorId: string }>;
}) {
  const { doctorId } = await params;
  const doctor = await getDoctor(doctorId);

  if (!doctor) {
    redirect("/admin/doctors");
  }

  return (
    <DoctorForm
      mode="edit"
      doctorId={doctorId}
      initialData={{
        specialization: doctor.specialization,
        licenseNumber: doctor.licenseNumber,
        departmentId: doctor.departmentId,
      }}
    />
  );
}
