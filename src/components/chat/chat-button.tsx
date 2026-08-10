"use client";

import { ChatPanel } from "@/components/chat/chat-panel";
import type { UserRole } from "@/types/next-auth";

export function ChatButton({
  role,
  userId,
}: {
  role: UserRole;
  userId: string;
}) {
  return <ChatPanel role={role} userId={userId} />;
}
