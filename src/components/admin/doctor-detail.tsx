"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  CalendarOff,
  Pencil,
  Stethoscope,
} from "@/components/ui/icon";
import { ScheduleBlockManager } from "./schedule-block-form";
import { BlockedDatesManager } from "./blocked-dates-manager";

type ScheduleBlock = {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
};

type BlockedDate = {
  id: string;
  doctorId: string;
  date: Date;
  reason: string | null;
};

type DoctorDetailProps = {
  doctor: {
    id: string;
    name: string;
    email: string;
    specialization: string;
    licenseNumber: string;
    department: string;
    departmentId: string;
    scheduleBlocks: ScheduleBlock[];
    blockedDates: BlockedDate[];
  };
};

export function DoctorDetail({ doctor }: DoctorDetailProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"schedule" | "blocked">("schedule");

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/doctors")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{doctor.name}</h1>
          <p className="text-sm text-muted-foreground">
            {doctor.specialization} · {doctor.department}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/doctors/${doctor.id}/edit`)}
        >
          <Pencil className="size-4" />
          Edit Profile
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Stethoscope className="size-3.5" />
            Specialization
          </div>
          <p className="mt-1 text-sm font-medium text-foreground">
            {doctor.specialization}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">License Number</div>
          <p className="mt-1 text-sm font-medium text-foreground">
            {doctor.licenseNumber}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Email</div>
          <p className="mt-1 truncate text-sm font-medium text-foreground">
            {doctor.email}
          </p>
        </div>
      </div>

      {/* Schedule summary */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{doctor.scheduleBlocks.length} schedule blocks</span>
        <span>{doctor.blockedDates.length} blocked dates</span>
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
            doctorId={doctor.id}
            blocks={doctor.scheduleBlocks}
          />
        )}
        {tab === "blocked" && (
          <BlockedDatesManager
            doctorId={doctor.id}
            blockedDates={doctor.blockedDates}
          />
        )}
      </div>
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
          ? "border-blue-600 text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="size-4" />
      {children}
    </Button>
  );
}
