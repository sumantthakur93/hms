import { redirect } from "next/navigation";
import { getDepartment } from "@/actions/departments";
import { DepartmentForm } from "@/components/admin/department-form";

export default async function EditDepartmentPage({
  params,
}: {
  params: Promise<{ departmentId: string }>;
}) {
  const { departmentId } = await params;
  const result = await getDepartment(departmentId);

  if (!result.ok) {
    redirect("/admin/departments");
  }

  return (
    <DepartmentForm
      mode="edit"
      departmentId={departmentId}
      initialData={{
        name: result.department.name,
        description: result.department.description,
        consultationFee: result.department.consultationFee,
      }}
    />
  );
}
