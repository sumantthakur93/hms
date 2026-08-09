"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Loader2, AlertCircle, X } from "lucide-react";
import {
  createScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
  type ScheduleBlockInput,
} from "@/actions/schedule";

type ScheduleBlock = {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ScheduleBlockManager({
  doctorId,
  blocks: initialBlocks,
}: {
  doctorId: string;
  blocks: ScheduleBlock[];
}) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [showForm, setShowForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Group blocks by day
  const byDay: Record<number, ScheduleBlock[]> = {};
  for (const b of blocks) {
    if (!byDay[b.dayOfWeek]) byDay[b.dayOfWeek] = [];
    byDay[b.dayOfWeek].push(b);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteScheduleBlock(id);
    setDeletingId(null);
    if (result.ok) {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    }
  }

  function startEdit(block: ScheduleBlock) {
    setEditingBlock(block);
    setShowForm(true);
  }

  function startCreate() {
    setEditingBlock(null);
    setShowForm(true);
  }

  function handleSaved(block: ScheduleBlock, isEdit: boolean) {
    if (isEdit) {
      setBlocks((prev) => prev.map((b) => (b.id === block.id ? block : b)));
    } else {
      setBlocks((prev) => [...prev, block]);
    }
    setShowForm(false);
    setEditingBlock(null);
  }

  return (
    <div className="space-y-4">
      {/* Schedule blocks grouped by day */}
      <div className="space-y-3">
        {DAYS.map((day, idx) => {
          const dayBlocks = byDay[idx] ?? [];
          if (dayBlocks.length === 0) return null;
          return (
            <div
              key={idx}
              className="rounded-lg border border-slate-800 bg-slate-900/50 p-3"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {day}
              </p>
              <div className="space-y-2">
                {dayBlocks.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-md bg-slate-800/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-slate-200">
                        {b.startTime}–{b.endTime}
                      </span>
                      <span className="text-xs text-slate-500">
                        {b.slotDuration}min slots
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(b)}
                        aria-label="Edit block"
                        className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        disabled={deletingId === b.id}
                        aria-label="Delete block"
                        className="rounded p-1 text-slate-400 hover:bg-red-900/30 hover:text-red-400"
                      >
                        {deletingId === b.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {blocks.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-500">
            No schedule blocks yet. Add one to generate appointment slots.
          </p>
        )}
      </div>

      {/* Add button */}
      {!showForm && (
        <button
          onClick={startCreate}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 py-2.5 text-sm font-medium text-slate-400 hover:border-blue-600 hover:text-blue-500"
        >
          <Plus className="size-4" /> Add Schedule Block
        </button>
      )}

      {/* Form */}
      {showForm && (
        <ScheduleBlockForm
          doctorId={doctorId}
          editingBlock={editingBlock}
          onCancel={() => {
            setShowForm(false);
            setEditingBlock(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function ScheduleBlockForm({
  doctorId,
  editingBlock,
  onCancel,
  onSaved,
}: {
  doctorId: string;
  editingBlock: ScheduleBlock | null;
  onCancel: () => void;
  onSaved: (block: ScheduleBlock, isEdit: boolean) => void;
}) {
  const [dayOfWeek, setDayOfWeek] = useState(editingBlock?.dayOfWeek ?? 1);
  const [startTime, setStartTime] = useState(
    editingBlock?.startTime ?? "09:00",
  );
  const [endTime, setEndTime] = useState(editingBlock?.endTime ?? "13:00");
  const [slotDuration, setSlotDuration] = useState(
    editingBlock?.slotDuration ?? 30,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const input: ScheduleBlockInput = {
      doctorId,
      dayOfWeek,
      startTime,
      endTime,
      slotDuration,
    };

    const result = editingBlock
      ? await updateScheduleBlock(editingBlock.id, input)
      : await createScheduleBlock(input);

    setSaving(false);
    if (result.ok) {
      onSaved(result.block as ScheduleBlock, !!editingBlock);
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
        <h4 className="text-sm font-semibold text-slate-200">
          {editingBlock ? "Edit Block" : "New Schedule Block"}
        </h4>
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
          htmlFor="sb-day"
          className="mb-1 block text-xs font-medium text-slate-400"
        >
          Day of week
        </label>
        <select
          id="sb-day"
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          className="input"
        >
          {DAYS.map((d, i) => (
            <option key={i} value={i}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="sb-start"
            className="mb-1 block text-xs font-medium text-slate-400"
          >
            Start time
          </label>
          <input
            id="sb-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label
            htmlFor="sb-end"
            className="mb-1 block text-xs font-medium text-slate-400"
          >
            End time
          </label>
          <input
            id="sb-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="sb-slot"
          className="mb-1 block text-xs font-medium text-slate-400"
        >
          Slot duration (minutes)
        </label>
        <select
          id="sb-slot"
          value={slotDuration}
          onChange={(e) => setSlotDuration(Number(e.target.value))}
          className="input"
        >
          {[10, 15, 20, 30, 45, 60, 90, 120].map((d) => (
            <option key={d} value={d}>
              {d} min
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Saving...
          </>
        ) : (
          <>{editingBlock ? "Update Block" : "Add Block"}</>
        )}
      </button>
    </form>
  );
}
