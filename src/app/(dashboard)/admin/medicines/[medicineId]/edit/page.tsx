import { redirect } from "next/navigation";
import { getMedicine } from "@/actions/pharmacy";
import { MedicineForm } from "@/components/admin/medicine-form";

export default async function EditMedicinePage({
  params,
}: {
  params: Promise<{ medicineId: string }>;
}) {
  const { medicineId } = await params;
  const result = await getMedicine(medicineId);

  if (!result.ok) {
    redirect("/admin/medicines");
  }

  const { medicine } = result;

  return (
    <MedicineForm
      medicineId={medicine.id}
      initialData={{
        name: medicine.name,
        genericName: medicine.genericName,
        manufacturer: medicine.manufacturer,
        category: medicine.category,
        unitPrice: medicine.unitPrice,
        reorderLevel: medicine.reorderLevel,
      }}
    />
  );
}
