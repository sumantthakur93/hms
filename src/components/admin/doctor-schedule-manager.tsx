"use client";

import { useState } from "react";
import { Stethoscope, Calendar, CalendarOff, ChevronRight } from "lucide-react";
import { ScheduleBlockManager } from "./schedule-block-form";
import { BlockedDatesManager } from "./blocked-dates-manager";

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  department: string;
  scheduleBlocks: {
    id: string; doctorId: string; dayOfWeek: number;
    startTime: string; endTime: string; slotDuration: number;
  }[];
  blockedDates: {
    id: string; doctorId: string; date: Date; reason: string | null;
  }[];
};

export function DoctorScheduleManager({ doctors }: { doctors: Doctor[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(doctors[0]?.id ?? null);
  const [tab, setTab] = useState<"schedule" | "blocked">("schedule");

  const selected = doctors.find((d) => d.id === selectedId);

  if (doctors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-12 text-center">
        <Stethoscope className="mb-3 size-8 text-slate-700" />
        <p className="text-sm text-slate-500">No doctors found. Add doctors via the seed script.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Doctor list */}
      <div className="space-y-2">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Doctors</h3>
        {doctors.map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedId(d.id)}
            className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
              selectedId === d.id
                ? "border-blue-600 bg-blue-600/10"
                : "border-slate-800 bg-slate-900/50 hover:bg-slate-800/50"
            }`}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-800">
              <Stethoscope className="size-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-slate-100">{d.name}</p>
              <p className="truncate text-xs text-slate-500">{d.specialization} · {d.department}</p>
            </div>
            <ChevronRight className={`size-4 shrink-0 transition-transform ${selectedId === d.id ? "text-blue-500" : "text-slate-600"}`} />
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="space-y-4">
          {/* Doctor header */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <h2 className="text-lg font-semibold text-slate-100">{selected.name}</h2>
            <p className="text-sm text-slate-400">
              {selected.specialization} · {selected.department}
            </p>
            <div className="mt-3 flex gap-4 text-xs text-slate-500">
              <span>{selected.scheduleBlocks.length} schedule blocks</span>
              <span>{selected.blockedDates.length} blocked dates</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-800">
            <TabButton active={tab === "schedule"} onClick={() => setTab("schedule")} icon={Calendar}>
              Schedule Blocks
            </TabButton>
            <TabButton active={tab === "blocked"} onClick={() => setTab("blocked")} icon={CalendarOff}>
              Blocked Dates
            </TabButton>
          </div>

          {/* Tab content */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            {tab === "schedule" && (
              <ScheduleBlockManager doctorId={selected.id} blocks={selected.scheduleBlocks} />
            )}
            {tab === "blocked" && (
              <BlockedDatesManager doctorId={selected.id} blockedDates={selected.blockedDates} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active, onClick, icon: Icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-blue-600 text-blue-500"
          : "border-transparent text-slate-400 hover:text-slate-200"
      }`}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}
