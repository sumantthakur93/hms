import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChatPage } from "@/components/chat/chat-page";

export default async function AdminConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");
  const { conversationId } = await params;

  // Ownership check — don't render a conversation that isn't this user's.
  const owned = await prisma.chatConversation.findFirst({
    where: { id: conversationId, userId: session.user.id },
    select: { id: true },
  });
  if (!owned) redirect("/admin/chat");

  return (
    <ChatPage
      role="ADMIN"
      userName={session.user.name}
      basePath="/admin/chat"
      initialConversationId={conversationId}
    />
  );
}
