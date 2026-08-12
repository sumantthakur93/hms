"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  X,
  Send,
  MessageSquare,
  Paperclip,
  Menu,
  Plus,
} from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { UserRole } from "@/types/next-auth";
import { ROLE_BADGES } from "@/lib/chat-tools";
import { MessageList, getMessageText } from "@/components/chat/message-list";
import { useChatThread } from "@/components/chat/use-chat-thread";
import {
  ConversationList,
  type ConversationSummary,
} from "@/components/chat/conversation-list";

const STORAGE_KEY = "hms.chat.activeConversationId";

function readStoredId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredId(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ─── Inner thread (keyed per conversation for clean switching) ───────────────

function ChatPanelThread({
  role,
  conversationId,
  onConversationCreated,
}: {
  role: UserRole;
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
}) {
  const {
    input,
    setInput,
    messages,
    sendMessage,
    isLoading,
    error,
    messagesEndRef,
    suggestedPrompts,
    handleSuggested,
    handleSubmit,
  } = useChatThread({ role, conversationId, onConversationCreated });

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          error={error}
          onConfirm={() => sendMessage({ text: "Yes, please proceed." })}
          onCancel={() => sendMessage({ text: "No, cancel." })}
          emptyState={
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="size-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Ask me anything about your health records.
              </p>
            </div>
          }
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length === 0 && suggestedPrompts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          {suggestedPrompts.map((p) => (
            <Button
              key={p}
              onClick={() => handleSuggested(p)}
              variant="outline"
              size="sm"
              className="rounded-full px-3 py-1 text-xs"
            >
              {p}
            </Button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        id="chat-form"
        onSubmit={handleSubmit}
        className="border-t border-border p-3"
      >
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Attach file"
            title="File attachments are not supported yet"
          >
            <Paperclip className="size-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          AI can perform actions on your behalf based on your role.
        </p>
      </form>
    </>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export function ChatPanel({
  role,
  open: externalOpen,
  onOpenChange,
}: {
  role: UserRole;
  userId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [conversationId, setConversationId] = useState<string | null>(null);
  // Thread key controls remounting — only changes on explicit select/new-chat,
  // NOT when a conversation is created mid-thread (preserves streamed messages).
  const [threadKey, setThreadKey] = useState("new");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [resumeChecked, setResumeChecked] = useState(false);

  const isNewChat = !conversationId;

  // On first open: load the conversation list, and resume the stored
  // conversation if it still belongs to the user — otherwise start fresh.
  useEffect(() => {
    if (!open || resumeChecked) return;
    let cancelled = false;
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.conversations) return;
        const list = data.conversations as ConversationSummary[];
        setConversations(list);
        const stored = readStoredId();
        if (stored && list.some((c) => c.id === stored)) {
          setConversationId(stored);
          setThreadKey(stored);
        } else {
          // Stale or missing — start a new chat
          writeStoredId(null);
          setConversationId(null);
        }
        setResumeChecked(true);
      })
      .catch(() => {
        setResumeChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, resumeChecked]);

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

  const handleConversationCreated = useCallback(
    (id: string) => {
      // Update local state WITHOUT changing threadKey — the streamed messages
      // are already in the thread's useChat state, so we don't want to remount.
      setConversationId(id);
      writeStoredId(id);
      refreshList();
    },
    [refreshList],
  );

  const handleSelect = useCallback((id: string) => {
    setThreadKey(id);
    setConversationId(id);
    writeStoredId(id);
    setPopoverOpen(false);
  }, []);

  const handleNewChat = useCallback(() => {
    setThreadKey("new");
    setConversationId(null);
    writeStoredId(null);
    setPopoverOpen(false);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      const removed = conversations.find((c) => c.id === id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === conversationId) {
        setThreadKey("new");
        setConversationId(null);
        writeStoredId(null);
      }
      fetch(`/api/chat?conversationId=${id}`, { method: "DELETE" }).catch(
        () => {
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
    [conversations, conversationId, refreshList],
  );

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 hidden size-14 rounded-full p-0 shadow-lg transition-transform hover:scale-105 lg:flex"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="size-6" />
      </Button>
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="fixed bottom-0 right-0 z-50 flex h-full w-full flex-col border-l border-border bg-card shadow-2xl md:bottom-6 md:right-6 md:h-[600px] md:w-[380px] md:rounded-xl md:border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            {/* Conversation list popover */}
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Conversation list"
                  />
                }
              >
                <Menu className="size-4" />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-72 max-h-80 overflow-hidden p-2"
              >
                <ConversationList
                  conversations={conversations}
                  activeId={conversationId}
                  showNewChatPlaceholder={isNewChat}
                  onNewChat={handleNewChat}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                />
              </PopoverContent>
            </Popover>
            <Sparkles className="size-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                AI Health Assistant
              </p>
              <Badge variant="secondary" className="text-xs">
                {ROLE_BADGES[role]}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleNewChat}
              aria-label="New chat"
              title="New chat"
            >
              <Plus className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Thread — keyed by threadKey so switching conversations resets state,
            but creating a new conversation mid-thread doesn't remount. */}
        <ChatPanelThread
          key={threadKey}
          role={role}
          conversationId={conversationId}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </>
  );
}

// Re-export for tests / consumers that import from this module
export { getMessageText };
