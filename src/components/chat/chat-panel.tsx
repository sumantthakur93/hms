"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  X,
  Send,
  MessageSquare,
  Paperclip,
} from "@/components/ui/icon";
import type { UserRole } from "@/types/next-auth";
import {
  ROLE_BADGES,
  SUGGESTED_PROMPTS,
} from "@/lib/chat-tools";
import { MessageList, getMessageText } from "@/components/chat/message-list";

type ChatMetadata = { conversationId?: string };

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
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages, error } =
    useChat<UIMessage<ChatMetadata>>({
      transport: new DefaultChatTransport({
        api: "/api/chat",
        body: { conversationId },
      }),
      onFinish: ({ message }) => {
        // Capture conversationId streamed from the server via messageMetadata
        const id = (message.metadata as ChatMetadata | undefined)?.conversationId;
        if (id) setConversationId(id);
      },
    });

  const isLoading = status === "submitted" || status === "streaming";

  // Load conversation history on first open
  useEffect(() => {
    if (open && !conversationId && messages.length === 0) {
      fetch(`/api/chat`)
        .then((r) => r.json())
        .then((data) => {
          if (data.conversations?.length > 0) {
            const latest = data.conversations[0];
            setConversationId(latest.id);
            fetch(`/api/chat?conversationId=${latest.id}`)
              .then((r) => r.json())
              .then((msgData) => {
                if (msgData.messages?.length > 0) {
                  setMessages(
                    msgData.messages.map(
                      (m: { id: string; role: string; content: string }) =>
                        ({
                          id: m.id,
                          role: m.role as "user" | "assistant",
                          parts: [{ type: "text" as const, text: m.content }],
                        }) as UIMessage,
                    ),
                  );
                }
              });
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestedPrompts = SUGGESTED_PROMPTS[role] ?? [];

  const handleSuggested = useCallback(
    (prompt: string) => {
      setInput(prompt);
      setTimeout(() => {
        sendMessage({ text: prompt });
        setInput("");
      }, 50);
    },
    [sendMessage],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  }

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
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

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
      </div>
    </>
  );
}

// Re-export for tests / consumers that import from this module
export { getMessageText };
