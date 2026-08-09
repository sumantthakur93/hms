import { ResultEntry } from "@/components/lab/result-entry";

export default async function ResultEntryPage({
  params,
}: {
  params: Promise<{ labTestOrderId: string }>;
}) {
  const { labTestOrderId } = await params;
  return <ResultEntry labTestOrderId={labTestOrderId} />;
}
