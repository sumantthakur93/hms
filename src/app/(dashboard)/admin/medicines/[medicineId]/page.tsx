import { MedicineDetail } from "@/components/pharmacy/medicine-detail";

export default async function MedicineDetailPage({
  params,
}: {
  params: Promise<{ medicineId: string }>;
}) {
  const { medicineId } = await params;
  return <MedicineDetail medicineId={medicineId} />;
}
