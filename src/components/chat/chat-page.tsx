"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Menu } from "@/components/ui/icon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { UserRole } from "@/types/next-auth";
import { ROLE_BADGES } from "@/lib/chat-tools";
import { ChatThread } from "@/components/chat/chat-thread";
import {
  ConversationList,
  type ConversationSummary,
} from "@/components/chat/conversation-list";

type ChatPageProps = {
  role: UserRole;
  userName?: string | null;
  /** Base chat path for this role, e.g. "/doctor/chat" (no trailing slash). */
  basePath: string;
  /** Active conversation id from the URL (null/undefined = new chat). */
  initialConversationId?: string | null;
};

export function ChatPage({
  role,
  userName,
  basePath,
  initialConversationId,
}: ChatPageProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Local conversation id — initialized from the URL, then updated in-place
  // when the server creates a new conversation (without triggering a remount).
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null,
  );
  // The thread key controls remounting. It only changes on explicit select /
  // new-chat — NOT when a conversation is created mid-thread, so the streamed
  // messages survive.
  const [threadKey, setThreadKey] = useState(
    () => initialConversationId ?? "new",
  );

  const activeId = conversationId;
  // A new chat is active when there's no conversation id. Show the placeholder then.
  const isNewChat = !activeId;

  // ─── Load conversation list ────────────────────────────────────────────────
  const refreshList = useCallback(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => {
        if (data.conversations) {
          setConversations(data.conversations as ConversationSummary[]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  // ─── Navigation handlers ───────────────────────────────────────────────────
  const handleSelect = useCallback(
    (id: string) => {
      setThreadKey(id);
      setConversationId(id);
      router.push(`${basePath}/${id}`);
      setMobileSidebarOpen(false);
    },
    [router, basePath],
  );

  const handleNewChat = useCallback(() => {
    setThreadKey("new");
    setConversationId(null);
    router.push(basePath);
    setMobileSidebarOpen(false);
  }, [router, basePath]);

  const handleConversationCreated = useCallback(
    (id: string) => {
      // Server created/confirmed a conversation. Update local state + URL
      // WITHOUT triggering a navigation (which would remount the thread and
      // lose the just-streamed messages). replaceState updates the URL for
      // shareability/bookmarking without a Next.js route transition.
      if (id !== conversationId) {
        setConversationId(id);
        window.history.replaceState(null, "", `${basePath}/${id}`);
      }
      refreshList();
    },
    [conversationId, basePath, refreshList],
  );

  // ─── Delete (optimistic) ───────────────────────────────────────────────────
  const handleDelete = useCallback(
    (id: string) => {
      const removed = conversations.find((c) => c.id === id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      // If we deleted the active conversation, fall back to a new chat.
      if (id === conversationId) {
        setThreadKey("new");
        setConversationId(null);
        router.push(basePath);
      }
      fetch(`/api/chat?conversationId=${id}`, { method: "DELETE" }).catch(
        () => {
          // Restore on failure
          if (removed) {
            setConversations((prev) =>
              [...prev, removed].sort(
                (a, b) =>
                  new Date(b.updatedAt).getTime() -
                  new Date(a.updatedAt).getTime(),
              ),
            );
          }
          refreshList();
        },
      );
    },
    [conversations, conversationId, router, basePath, refreshList],
  );

  // ─── Sidebar content (shared by desktop column + mobile sheet) ─────────────
  const sidebarContent = (
    <ConversationList
      conversations={conversations}
      activeId={activeId}
      showNewChatPlaceholder={isNewChat}
      onNewChat={handleNewChat}
      onSelect={handleSelect}
      onDelete={handleDelete}
      className="px-2 pb-4"
    />
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border bg-card">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/50 md:flex">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Sparkles className="size-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">Chats</span>
        </div>
        {sidebarContent}
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-border p-3">
          <div className="flex items-center gap-2">
            {/* Mobile sidebar trigger */}
            <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="md:hidden"
                    aria-label="Open conversation list"
                  />
                }
              >
                <Menu className="size-4" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="flex flex-row items-center gap-2 border-b border-border p-3">
                  <Sparkles className="size-5 text-primary" />
                  <SheetTitle>Chats</SheetTitle>
                </SheetHeader>
                {sidebarContent}
              </SheetContent>
            </Sheet>
            <Sparkles className="size-5 text-primary md:hidden" />
            <div>
              <h1 className="text-sm font-semibold text-foreground">
                AI Health Assistant
              </h1>
              <Badge variant="secondary" className="text-xs">
                {ROLE_BADGES[role]}
              </Badge>
            </div>
          </div>
        </div>

        {/* Thread — keyed by threadKey so switching conversations resets state,
            but creating a new conversation mid-thread doesn't remount (preserving
            streamed messages). */}
        <div className="flex-1 overflow-hidden">
          <ChatThread
            key={threadKey}
            role={role}
            userName={userName}
            conversationId={activeId}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </div>
    </div>
  );
}
