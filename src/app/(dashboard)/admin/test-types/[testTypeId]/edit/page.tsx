import { redirect } from "next/navigation";
import { getTestType } from "@/actions/lab";
import { TestTypeForm } from "@/components/admin/test-type-form";

export default async function EditTestTypePage({
  params,
}: {
  params: Promise<{ testTypeId: string }>;
}) {
  const { testTypeId } = await params;
  const result = await getTestType(testTypeId);

  if (!result.ok) {
    redirect("/admin/test-types");
  }

  return (
    <TestTypeForm
      mode="edit"
      testTypeId={testTypeId}
      initialData={{
        name: result.testType.name,
        code: result.testType.code,
        category: result.testType.category,
        price: result.testType.price,
        description: result.testType.description,
      }}
    />
  );
}
