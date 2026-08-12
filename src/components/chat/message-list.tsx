"use client";

import ReactMarkdown from "react-markdown";
import { type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertCircle } from "@/components/ui/icon";
import { PENDING_CONFIRMATION_MARKER } from "@/lib/chat-tools";

// Extract text from a UIMessage's parts array
export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

const markdownComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
      <ArrowRight className="size-3" />
      {href ? (
        <a href={href} className="hover:underline">
          {children}
        </a>
      ) : (
        children
      )}
    </span>
  ),
};

type MessageListProps = {
  messages: UIMessage[];
  isLoading: boolean;
  error?: Error;
  onConfirm: () => void;
  onCancel: () => void;
  emptyState: React.ReactNode;
  /** max-w utility class for bubbles, differs between panel and page */
  bubbleMaxWidth?: string;
};

export function MessageList({
  messages,
  isLoading,
  error,
  onConfirm,
  onCancel,
  emptyState,
  bubbleMaxWidth = "max-w-[85%]",
}: MessageListProps) {
  return (
    <div className="space-y-3">
      {messages.length === 0 && !isLoading && !error && emptyState}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Something went wrong</p>
            <p className="text-xs opacity-90">
              {error.message || "The assistant could not respond. Please try again."}
            </p>
          </div>
        </div>
      )}

      {messages.map((m) => {
        const text = getMessageText(m);
        const isPending = text.includes(PENDING_CONFIRMATION_MARKER);
        // Tool-only assistant turn with no text — show a non-blank placeholder
        const displayText =
          m.role === "assistant" && text.trim() === "" ? "_(action completed)_" : text;
        return (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`${bubbleMaxWidth} rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-muted text-foreground"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2 prose-table:text-xs">
                  <ReactMarkdown components={markdownComponents}>
                    {displayText}
                  </ReactMarkdown>
                  {isPending && (
                    <div className="mt-2 flex gap-2 not-prose">
                      <Button size="sm" onClick={onConfirm}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="outline" onClick={onCancel}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{text}</div>
              )}
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex justify-start">
          <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            Thinking…
          </div>
        </div>
      )}
    </div>
  );
}
