import { InvoiceScreen } from "@/components/billing/invoice-screen";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  return <InvoiceScreen invoiceId={invoiceId} />;
}
