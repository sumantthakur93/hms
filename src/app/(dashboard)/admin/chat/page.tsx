import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChatPage } from "@/components/chat/chat-page";

export default async function AdminChatPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  return (
    <ChatPage
      role="ADMIN"
      userName={session.user.name}
      basePath="/admin/chat"
    />
  );
}
