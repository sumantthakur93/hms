"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Sparkles,
  MessageSquare,
  Paperclip,
} from "@/components/ui/icon";
import type { UserRole } from "@/types/next-auth";
import {
  ROLE_BADGES,
  SUGGESTED_PROMPTS,
} from "@/lib/chat-tools";
import { MessageList } from "@/components/chat/message-list";

type ChatMetadata = { conversationId?: string };

export function ChatPage({ role }: { role: UserRole; userId: string }) {
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
        const id = (message.metadata as ChatMetadata | undefined)?.conversationId;
        if (id) setConversationId(id);
      },
    });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!conversationId && messages.length === 0) {
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
  }, []);

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

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">
            AI Health Assistant
          </h1>
          <Badge variant="secondary" className="text-xs">
            {ROLE_BADGES[role]}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card/50 p-4">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          error={error}
          onConfirm={() => sendMessage({ text: "Yes, please proceed." })}
          onCancel={() => sendMessage({ text: "No, cancel." })}
          bubbleMaxWidth="max-w-[80%]"
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="size-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Ask me anything about your health records.
              </p>
            </div>
          }
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length === 0 && suggestedPrompts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((p) => (
            <Button
              key={p}
              onClick={() => handleSuggested(p)}
              variant="outline"
              size="sm"
              className="rounded-full px-3 py-1.5 text-xs"
            >
              {p}
            </Button>
          ))}
        </div>
      )}

      {/* Input */}
      <form id="chat-page-form" onSubmit={handleSubmit} className="flex gap-2">
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
        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        AI can perform actions on your behalf based on your role.
      </p>
    </div>
  );
}
