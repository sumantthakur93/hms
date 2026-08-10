import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChatPage } from "@/components/chat/chat-page";

export default async function PatientChatPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") redirect("/");
  return <ChatPage role="PATIENT" userId={session.user.id} />;
}
