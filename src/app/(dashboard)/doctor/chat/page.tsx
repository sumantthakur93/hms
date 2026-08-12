import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ChatPage } from "@/components/chat/chat-page";

export default async function DoctorChatPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOCTOR") redirect("/");
  return (
    <ChatPage
      role="DOCTOR"
      userName={session.user.name}
      basePath="/doctor/chat"
    />
  );
}
