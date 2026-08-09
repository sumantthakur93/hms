"use client";

import {
  LayoutDashboard, Building2, Stethoscope, Users, Pill, TestTube, Receipt,
  Settings, CalendarClock, UserPlus, Search, MessageSquare, CalendarPlus,
  History, ListTodo, CheckCircle2, FileText, Bell, ChevronLeft, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-config";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Building2, Stethoscope, Users, Pill, TestTube, Receipt,
  Settings, CalendarClock, UserPlus, Search, MessageSquare, CalendarPlus,
  History, ListTodo, CheckCircle2, FileText,
};

export function DashboardShell({
  navItems,
  brand,
  roleLabel,
  userName,
  userEmail,
  children,
}: {
  navItems: NavItem[];
  brand: string;
  roleLabel: string;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-slate-800 bg-slate-900 transition-all lg:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
            {brand[0] ?? "C"}
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-blue-400">{brand}</span>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon] ?? LayoutDashboard;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-blue-950/60 text-blue-400"
                    : "text-slate-400 hover:bg-slate-800"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-400">
              {(userName || roleLabel)[0]}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">
                  {userName || roleLabel}
                </p>
                <p className="truncate text-xs text-slate-500">{userEmail}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b border-slate-800 bg-slate-900 px-6">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex size-8 items-center justify-center rounded-md border border-slate-800 text-slate-400 hover:bg-slate-800"
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </button>
          <h2 className="text-sm font-semibold text-slate-300">
            {roleLabel} Dashboard
          </h2>
          <div className="ml-auto hidden items-center gap-2 rounded-lg border border-slate-800 px-3 py-1.5 text-sm text-slate-500 md:flex">
            <Search className="size-4" /> Search…
          </div>
          <button className="relative flex size-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800">
            <Bell className="size-4" />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-rose-500" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
