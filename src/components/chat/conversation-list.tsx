"use client";

import { useState } from "react";
import { isToday, isYesterday, differenceInCalendarDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "@/components/ui/icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConversationSummary = {
  id: string;
  title: string | null;
  updatedAt: string;
};

type ConversationListProps = {
  conversations: ConversationSummary[];
  activeId: string | null;
  /** When true, a synthetic "New chat" entry is rendered at the top and highlighted. */
  showNewChatPlaceholder?: boolean;
  onSelect: (id: string) => void;
  onNewChat?: () => void;
  onDelete: (id: string) => void;
  /** Optional className for the scroll container. */
  className?: string;
};

// ─── Date grouping ───────────────────────────────────────────────────────────

type Group = { label: string; items: ConversationSummary[] };

function groupByDate(conversations: ConversationSummary[]): Group[] {
  const groups: Record<string, ConversationSummary[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };
  const now = new Date();
  for (const c of conversations) {
    const d = new Date(c.updatedAt);
    if (isToday(d)) groups.Today.push(c);
    else if (isYesterday(d)) groups.Yesterday.push(c);
    else if (differenceInCalendarDays(now, d) <= 7)
      groups["Previous 7 Days"].push(c);
    else groups.Older.push(c);
  }
  return (Object.keys(groups) as Group["label"][])
    .map((label) => ({ label, items: groups[label] }))
    .filter((g) => g.items.length > 0);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConversationList({
  conversations,
  activeId,
  showNewChatPlaceholder = false,
  onSelect,
  onNewChat,
  onDelete,
  className,
}: ConversationListProps) {
  const [pendingDelete, setPendingDelete] =
    useState<ConversationSummary | null>(null);

  const groups = groupByDate(conversations);

  return (
    <div className={`flex flex-col gap-1 overflow-y-auto ${className ?? ""}`}>
      {onNewChat && (
        <Button
          variant="ghost"
          onClick={onNewChat}
          className="justify-start gap-2 rounded-lg px-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Plus className="size-4" />
          New chat
        </Button>
      )}

      {showNewChatPlaceholder && (
        <div className="rounded-lg bg-muted px-2 py-2 text-sm font-medium text-foreground">
          New chat
        </div>
      )}

      {groups.length === 0 && !showNewChatPlaceholder && (
        <p className="px-2 py-4 text-xs text-muted-foreground">
          No conversations yet.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          <p className="px-2 pt-3 pb-1 text-xs font-medium text-muted-foreground">
            {group.label}
          </p>
          {group.items.map((c) => {
            const isActive = c.id === activeId;
            return (
              <div
                key={c.id}
                className={`group flex items-center gap-1 rounded-lg pr-1 text-sm transition-colors ${
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Button
                  variant="ghost"
                  onClick={() => onSelect(c.id)}
                  className="flex-1 justify-start truncate px-2 py-2 text-left font-normal"
                  title={c.title ?? "Untitled conversation"}
                >
                  {c.title || "Untitled conversation"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete conversation ${c.title ?? ""}`}
                  onClick={() => setPendingDelete(c)}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      ))}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{pendingDelete?.title ?? "Untitled conversation"}&rdquo;
              will be permanently deleted. This can&rsquo;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) {
                  onDelete(pendingDelete.id);
                  setPendingDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
