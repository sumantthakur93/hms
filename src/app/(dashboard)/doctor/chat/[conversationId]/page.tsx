import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChatPage } from "@/components/chat/chat-page";

export default async function DoctorConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DOCTOR") redirect("/");
  const { conversationId } = await params;

  const owned = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId: session.user.id },
    select: { id: true },
  });
  if (!owned) redirect("/doctor/chat");

  return (
    <ChatPage
      role="DOCTOR"
      userName={session.user.name}
      basePath="/doctor/chat"
      initialConversationId={conversationId}
    />
  );
}
