"use client";

import { ChatPanel } from "@/components/chat/chat-panel";
import type { UserRole } from "@/types/next-auth";

export function ChatButton({
  role,
  userId,
  open,
  onOpenChange,
}: {
  role: UserRole;
  userId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <ChatPanel
      role={role}
      userId={userId}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
