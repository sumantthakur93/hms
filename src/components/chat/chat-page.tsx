"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "ai/react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Sparkles,
  MessageSquare,
  Paperclip,
  ArrowRight,
} from "@/components/ui/icon";
import type { UserRole } from "@/types/next-auth";

const ROLE_BADGES: Record<UserRole, string> = {
  ADMIN: "Admin mode",
  DOCTOR: "Doctor mode",
  PATIENT: "Patient mode",
  RECEPTIONIST: "Receptionist mode",
  LAB_TECHNICIAN: "Lab mode",
};

const SUGGESTED_PROMPTS: Record<UserRole, string[]> = {
  ADMIN: [
    "Show today's appointments",
    "Check medicine stock",
    "Show recent invoices",
  ],
  DOCTOR: ["Show today's appointments", "Summarize last visit", "Order CBC"],
  PATIENT: [
    "When is my next appointment?",
    "Show my prescriptions",
    "Book appointment",
  ],
  RECEPTIONIST: [
    "Show today's appointments",
    "Search patient",
    "Show invoices",
  ],
  LAB_TECHNICIAN: ["Show lab queue", "List test types"],
};

export function ChatPage({ role }: { role: UserRole; userId: string }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
  } = useChat({
    api: "/api/chat",
    body: { conversationId },
    onResponse: (response) => {
      const convId = response.headers.get("X-Conversation-Id");
      if (convId && !conversationId) {
        setConversationId(convId);
      }
    },
  });

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
                      (m: { role: string; content: string }) => ({
                        id: Math.random().toString(36),
                        role: m.role as "user" | "assistant",
                        content: m.content,
                      }),
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
      const fakeEvent = {
        target: { value: prompt },
      } as React.ChangeEvent<HTMLInputElement>;
      handleInputChange(fakeEvent);
      setTimeout(() => {
        const form = document.getElementById(
          "chat-page-form",
        ) as HTMLFormElement;
        form?.requestSubmit();
      }, 50);
    },
    [handleInputChange],
  );

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
      <div className="flex-1 overflow-y-auto space-y-3 rounded-xl border border-border bg-card/50 p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="size-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Ask me anything about your health records.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-muted text-foreground"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2 prose-table:text-xs">
                  <ReactMarkdown
                    components={{
                      a: ({ href, children }) => (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          <ArrowRight className="size-3" />
                          <a href={href} className="hover:underline">
                            {children}
                          </a>
                        </span>
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              Thinking…
            </div>
          </div>
        )}

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
        >
          <Paperclip className="size-4" />
        </Button>
        <Input
          value={input}
          onChange={handleInputChange}
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
