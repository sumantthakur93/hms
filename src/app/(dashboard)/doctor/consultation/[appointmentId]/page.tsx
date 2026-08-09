import { ConsultationScreen } from "@/components/doctor/consultation-screen";

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  return <ConsultationScreen appointmentId={appointmentId} />;
}
