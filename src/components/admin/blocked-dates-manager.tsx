"use client";

import { useState } from "react";
import {
  CalendarOff,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { addBlockedDate, removeBlockedDate } from "@/actions/schedule";

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
          <p className="py-4 text-center text-sm text-slate-500">
            No blocked dates. The doctor is available on all scheduled days.
          </p>
        ) : (
          blockedDates.map((bd) => (
            <div
              key={bd.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <CalendarOff className="size-4 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {new Date(bd.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  {bd.reason && (
                    <p className="text-xs text-slate-500">{bd.reason}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(bd.id)}
                disabled={deletingId === bd.id}
                aria-label="Remove blocked date"
                className="rounded p-1 text-slate-400 hover:bg-red-900/30 hover:text-red-400"
              >
                {deletingId === bd.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 py-2.5 text-sm font-medium text-slate-400 hover:border-blue-600 hover:text-blue-500"
        >
          <Plus className="size-4" /> Block a Date
        </button>
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
      className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-200">Block a Date</h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-500 hover:text-slate-300"
        >
          <X className="size-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-800/50 bg-red-900/20 p-2 text-xs text-red-300">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="blocked-date"
          className="mb-1 block text-xs font-medium text-slate-400"
        >
          Date
        </label>
        <input
          id="blocked-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input"
          required
        />
      </div>

      <div>
        <label
          htmlFor="blocked-reason"
          className="mb-1 block text-xs font-medium text-slate-400"
        >
          Reason (optional)
        </label>
        <input
          id="blocked-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="input"
          placeholder="Leave, holiday, emergency..."
        />
      </div>

      <button
        type="submit"
        disabled={saving || !date}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Blocking...
          </>
        ) : (
          <>
            <CalendarOff className="size-4" /> Block Date
          </>
        )}
      </button>
    </form>
  );
}
