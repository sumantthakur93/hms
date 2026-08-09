"use client";

import { useState } from "react";
import {
  CalendarOff,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  X,
} from "@/components/ui/icon";
import { addBlockedDate, removeBlockedDate } from "@/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BlockedDate = {
  id: string;
  doctorId: string;
  date: Date;
  reason: string | null;
};

export function BlockedDatesManager({
  doctorId,
  blockedDates: initialBlockedDates,
}: {
  doctorId: string;
  blockedDates: BlockedDate[];
}) {
  const [blockedDates, setBlockedDates] = useState(initialBlockedDates);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await removeBlockedDate(id);
    setDeletingId(null);
    if (result.ok) {
      setBlockedDates((prev) => prev.filter((bd) => bd.id !== id));
    }
  }

  function handleAdded(blocked: BlockedDate) {
    setBlockedDates((prev) =>
      [...prev, blocked].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    );
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      {/* Existing blocked dates */}
      <div className="space-y-2">
        {blockedDates.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No blocked dates. The doctor is available on all scheduled days.
          </p>
        ) : (
          blockedDates.map((bd) => (
            <div
              key={bd.id}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <CalendarOff className="size-4 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(bd.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  {bd.reason && (
                    <p className="text-xs text-muted-foreground">{bd.reason}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDelete(bd.id)}
                disabled={deletingId === bd.id}
                aria-label="Remove blocked date"
                className="text-muted-foreground hover:text-red-400"
              >
                {deletingId === bd.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Add button */}
      {!showForm && (
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full border-dashed"
        >
          <Plus className="size-4" /> Block a Date
        </Button>
      )}

      {/* Form */}
      {showForm && (
        <BlockedDateForm
          doctorId={doctorId}
          onCancel={() => setShowForm(false)}
          onSaved={handleAdded}
        />
      )}
    </div>
  );
}

function BlockedDateForm({
  doctorId,
  onCancel,
  onSaved,
}: {
  doctorId: string;
  onCancel: () => void;
  onSaved: (blocked: BlockedDate) => void;
}) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const result = await addBlockedDate({
      doctorId,
      date,
      reason: reason || undefined,
    });

    setSaving(false);
    if (result.ok) {
      onSaved(result.blocked as BlockedDate);
    } else {
      setError(result.error);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Block a Date</h4>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel}>
          <X className="size-4" />
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-800/50 bg-red-900/20 p-2 text-xs text-red-300">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="blocked-date">Date</Label>
        <Input
          id="blocked-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="blocked-reason">Reason (optional)</Label>
        <Input
          id="blocked-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Leave, holiday, emergency..."
        />
      </div>

      <Button type="submit" disabled={saving || !date} className="w-full">
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Blocking...
          </>
        ) : (
          <>
            <CalendarOff className="size-4" /> Block Date
          </>
        )}
      </Button>
    </form>
  );
}
