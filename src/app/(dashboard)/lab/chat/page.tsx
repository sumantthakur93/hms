import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChatPage } from "@/components/chat/chat-page";

export default async function LabChatPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "LAB_TECHNICIAN") redirect("/");
  return (
    <ChatPage
      role="LAB_TECHNICIAN"
      userName={session.user.name}
      basePath="/lab/chat"
    />
  );
}
