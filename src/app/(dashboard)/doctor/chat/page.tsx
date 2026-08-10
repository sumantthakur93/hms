import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChatPage } from "@/components/chat/chat-page";

export default async function DoctorChatPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOCTOR") redirect("/");
  return <ChatPage role="DOCTOR" userId={session.user.id} />;
}
