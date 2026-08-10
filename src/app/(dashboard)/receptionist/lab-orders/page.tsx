import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LabOrderClassification } from "@/components/receptionist/lab-order-classification";

export default async function ReceptionistLabOrdersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "RECEPTIONIST") {
    redirect("/receptionist");
  }

  return <LabOrderClassification />;
}
