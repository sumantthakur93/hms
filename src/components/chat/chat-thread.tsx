"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Sparkles } from "@/components/ui/icon";
import type { UserRole } from "@/types/next-auth";
import { ROLE_BADGES } from "@/lib/chat-tools";
import { MessageList } from "@/components/chat/message-list";
import { useChatThread } from "@/components/chat/use-chat-thread";

type ChatThreadProps = {
  role: UserRole;
  userName?: string | null;
  conversationId: string | null;
  /** Fired when the server creates/returns a conversation id for this thread. */
  onConversationCreated: (id: string) => void;
};

export function ChatThread({
  role,
  userName,
  conversationId,
  onConversationCreated,
}: ChatThreadProps) {
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

  const greetingName = userName ? userName.split(" ")[0] : null;
  const greeting = greetingName
    ? `What can I help with, ${greetingName}?`
    : "What can I help with?";

  return (
    <div className="flex h-full flex-col">
      {/* Messages / empty state */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !isLoading && !error ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 py-12 text-center">
            <Sparkles className="size-10 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {greeting}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {ROLE_BADGES[role]}
              </p>
            </div>
            {suggestedPrompts.length > 0 && (
              <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestedPrompts.map((p) => (
                  <Button
                    key={p}
                    onClick={() => handleSuggested(p)}
                    variant="outline"
                    className="h-auto whitespace-normal rounded-xl bg-card px-3 py-3 text-left text-sm text-foreground"
                  >
                    {p}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <MessageList
              messages={messages}
              isLoading={isLoading}
              error={error}
              onConfirm={() => sendMessage({ text: "Yes, please proceed." })}
              onCancel={() => sendMessage({ text: "No, cancel." })}
              bubbleMaxWidth="max-w-[80%]"
              emptyState={null}
            />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form
        id="chat-page-form"
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-border p-3"
      >
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
      <p className="px-3 pb-2 text-center text-xs text-muted-foreground">
        AI can perform actions on your behalf based on your role.
      </p>
    </div>
  );
}
