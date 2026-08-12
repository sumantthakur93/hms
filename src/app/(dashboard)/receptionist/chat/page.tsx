import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChatPage } from "@/components/chat/chat-page";

export default async function ReceptionistChatPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "RECEPTIONIST") redirect("/");
  return (
    <ChatPage
      role="RECEPTIONIST"
      userName={session.user.name}
      basePath="/receptionist/chat"
    />
  );
}
