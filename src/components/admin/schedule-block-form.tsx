"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Loader2, AlertCircle, X } from "lucide-react";
import {
  createScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
  type ScheduleBlockInput,
} from "@/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";

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
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {day}
              </p>
              <div className="space-y-2">
                {dayBlocks.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-foreground">
                        {b.startTime}–{b.endTime}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {b.slotDuration}min slots
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => startEdit(b)}
                        aria-label="Edit block"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(b.id)}
                        disabled={deletingId === b.id}
                        aria-label="Delete block"
                        className="text-muted-foreground hover:text-red-400"
                      >
                        {deletingId === b.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {blocks.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No schedule blocks yet. Add one to generate appointment slots.
          </p>
        )}
      </div>

      {/* Add button */}
      {!showForm && (
        <Button
          variant="outline"
          onClick={startCreate}
          className="w-full border-dashed"
        >
          <Plus className="size-4" /> Add Schedule Block
        </Button>
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
      className="space-y-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          {editingBlock ? "Edit Block" : "New Schedule Block"}
        </h4>
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
        <Label htmlFor="sb-day">Day of week</Label>
        <Select
          value={String(dayOfWeek)}
          onValueChange={(v) => setDayOfWeek(Number(v))}
        >
          <SelectTrigger id="sb-day" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map((d, i) => (
              <SelectItem key={i} value={String(i)}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="sb-start">Start time</Label>
          <Input
            id="sb-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sb-end">End time</Label>
          <Input
            id="sb-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sb-slot">Slot duration (minutes)</Label>
        <Select
          value={String(slotDuration)}
          onValueChange={(v) => setSlotDuration(Number(v))}
        >
          <SelectTrigger id="sb-slot" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 15, 20, 30, 45, 60, 90, 120].map((d) => (
              <SelectItem key={d} value={String(d)}>
                {d} min
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Saving...
          </>
        ) : (
          <>{editingBlock ? "Update Block" : "Add Block"}</>
        )}
      </Button>
    </form>
  );
}
