"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import type { UserRole } from "@/types/next-auth";
import { SUGGESTED_PROMPTS } from "@/lib/chat-tools";

type ChatMetadata = { conversationId?: string };

type UseChatThreadOptions = {
  role: UserRole;
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
};

/**
 * Shared chat-thread logic: wires `useChat` to /api/chat with the conversation
 * id, loads history when mounting for an existing conversation, auto-scrolls,
 * and exposes suggested-prompt + submit helpers. Used by both ChatPage's
 * ChatThread and ChatPanel's inner thread so the two surfaces don't drift.
 */
export function useChatThread({
  role,
  conversationId,
  onConversationCreated,
}: UseChatThreadOptions) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages, error } = useChat<
    UIMessage<ChatMetadata>
  >({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { conversationId },
    }),
    onFinish: ({ message }) => {
      const id = (message.metadata as ChatMetadata | undefined)?.conversationId;
      if (id) onConversationCreated(id);
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Track whether we already have messages, via a ref so it doesn't retrigger
  // the effect. When a conversation is created mid-thread (new chat → server
  // returns an id), the messages are already in useChat state — skip the reload.
  const hasMessagesRef = useRef(false);
  hasMessagesRef.current = messages.length > 0;

  // Load history when this thread mounts for an existing conversation.
  useEffect(() => {
    if (!conversationId) return;
    // Don't reload if we already have messages (e.g., conversation was just
    // created in this thread and the streamed messages are already in state).
    if (hasMessagesRef.current) return;
    let cancelled = false;
    fetch(`/api/chat?conversationId=${conversationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.messages?.length) return;
        setMessages(
          data.messages.map(
            (m: { id: string; role: string; content: string }) =>
              ({
                id: m.id,
                role: m.role as "user" | "assistant",
                parts: [{ type: "text" as const, text: m.content }],
              }) as UIMessage,
          ),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
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

  return {
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
  };
}
