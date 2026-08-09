"use client";

import { useState } from "react";
import { Stethoscope, Calendar, CalendarOff, ChevronRight } from "lucide-react";
import { ScheduleBlockManager } from "./schedule-block-form";
import { BlockedDatesManager } from "./blocked-dates-manager";
import { Button } from "@/components/ui/button";

type Doctor = {
  id: string;
  name: string;
  specialization: string;
  department: string;
  scheduleBlocks: {
    id: string;
    doctorId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDuration: number;
  }[];
  blockedDates: {
    id: string;
    doctorId: string;
    date: Date;
    reason: string | null;
  }[];
};

export function DoctorScheduleManager({ doctors }: { doctors: Doctor[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    doctors[0]?.id ?? null,
  );
  const [tab, setTab] = useState<"schedule" | "blocked">("schedule");

  const selected = doctors.find((d) => d.id === selectedId);

  if (doctors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
        <Stethoscope className="mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No doctors found. Add doctors via the seed script.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Doctor list */}
      <div className="space-y-2">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Doctors
        </h3>
        {doctors.map((d) => (
          <Button
            key={d.id}
            variant={selectedId === d.id ? "default" : "outline"}
            onClick={() => setSelectedId(d.id)}
            className="flex w-full items-center gap-3 justify-start h-auto py-3 font-normal"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <Stethoscope className="size-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-sm font-medium">{d.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {d.specialization} · {d.department}
              </p>
            </div>
            <ChevronRight
              className={`size-4 shrink-0 transition-transform ${selectedId === d.id ? "" : "text-muted-foreground"}`}
            />
          </Button>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="space-y-4">
          {/* Doctor header */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold text-foreground">
              {selected.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selected.specialization} · {selected.department}
            </p>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span>{selected.scheduleBlocks.length} schedule blocks</span>
              <span>{selected.blockedDates.length} blocked dates</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            <TabButton
              active={tab === "schedule"}
              onClick={() => setTab("schedule")}
              icon={Calendar}
            >
              Schedule Blocks
            </TabButton>
            <TabButton
              active={tab === "blocked"}
              onClick={() => setTab("blocked")}
              icon={CalendarOff}
            >
              Blocked Dates
            </TabButton>
          </div>

          {/* Tab content */}
          <div className="rounded-xl border border-border bg-card p-5">
            {tab === "schedule" && (
              <ScheduleBlockManager
                doctorId={selected.id}
                blocks={selected.scheduleBlocks}
              />
            )}
            {tab === "blocked" && (
              <BlockedDatesManager
                doctorId={selected.id}
                blockedDates={selected.blockedDates}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`border-b-2 rounded-none ${
        active
          ? "border-blue-600 text-blue-500"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="size-4" />
      {children}
    </Button>
  );
}
