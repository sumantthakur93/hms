"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, Send, MessageSquare } from "@/components/ui/icon";
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

export function ChatPanel({ role }: { role: UserRole; userId: string }) {
  const [open, setOpen] = useState(false);
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
    onFinish: (_message) => {
      // Conversation ID is set via response headers
    },
    onResponse: (response) => {
      const convId = response.headers.get("X-Conversation-Id");
      if (convId && !conversationId) {
        setConversationId(convId);
      }
    },
  });

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
  }, [open]);

  // Auto-scroll to bottom
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
      // Submit after a tick so input state updates
      setTimeout(() => {
        const form = document.getElementById("chat-form") as HTMLFormElement;
        form?.requestSubmit();
      }, 50);
    },
    [handleInputChange],
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="size-6" />
      </button>
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
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="size-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
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
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-muted text-foreground"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
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
          <div className="flex flex-wrap gap-1.5 px-3 pb-2">
            {suggestedPrompts.map((p) => (
              <button
                key={p}
                onClick={() => handleSuggested(p)}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
              >
                {p}
              </button>
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
            <Input
              value={input}
              onChange={handleInputChange}
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
