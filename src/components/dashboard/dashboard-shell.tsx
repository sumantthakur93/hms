"use client";

import {
  LayoutDashboard,
  Building2,
  Stethoscope,
  Users,
  Pill,
  TestTube,
  Receipt,
  Settings,
  CalendarClock,
  UserPlus,
  Search,
  MessageSquare,
  CalendarPlus,
  History,
  ListTodo,
  CheckCircle2,
  FileText,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MoreHorizontal,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav-config";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Building2,
  Stethoscope,
  Users,
  Pill,
  TestTube,
  Receipt,
  Settings,
  CalendarClock,
  UserPlus,
  Search,
  MessageSquare,
  CalendarPlus,
  History,
  ListTodo,
  CheckCircle2,
  FileText,
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Top 4 items for bottom tab bar, rest in "More" sheet
  const topItems = navItems.slice(0, 4);
  const moreItems = navItems.slice(4);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-slate-800 bg-slate-900 transition-all lg:flex",
          collapsed ? "w-16" : "w-60",
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
                    : "text-slate-400 hover:bg-slate-800",
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
        {/* Header */}
        <header className="flex h-16 items-center gap-4 border-b border-slate-800 bg-slate-900 px-4 md:px-6">
          {/* Sidebar toggle (desktop) */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden size-8 items-center justify-center rounded-md border border-slate-800 text-slate-400 hover:bg-slate-800 lg:flex"
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </button>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileNavOpen(true)}
            className="flex size-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>

          <h2 className="text-sm font-semibold text-slate-300">
            {roleLabel} Dashboard
          </h2>

          {/* Search (desktop) */}
          <div className="ml-auto hidden items-center gap-2 rounded-lg border border-slate-800 px-3 py-1.5 text-sm text-slate-500 md:flex">
            <Search className="size-4" /> Search…
          </div>

          {/* Notifications */}
          <button className="relative flex size-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800">
            <Bell className="size-4" />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-rose-500" />
          </button>

          {/* User dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-md p-1 hover:bg-slate-800"
            >
              <div className="flex size-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-400">
                {(userName || roleLabel)[0]}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-medium text-slate-200">{userName}</p>
                <p className="text-xs text-slate-500">{roleLabel}</p>
              </div>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-slate-800 bg-slate-900 py-1 shadow-xl">
                <div className="border-b border-slate-800 px-3 py-2">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {userName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{userEmail}</p>
                </div>
                <Link
                  href="/api/auth/signout"
                  className="mt-1 flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <LogOut className="size-4" />
                  Sign Out
                </Link>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile slide-out nav (full list) */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64 border-r border-slate-800 bg-slate-900">
            <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
                  {brand[0] ?? "C"}
                </div>
                <span className="text-lg font-bold text-blue-400">{brand}</span>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="flex size-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="space-y-1 p-2">
              {navItems.map((item) => {
                const Icon = ICONS[item.icon] ?? LayoutDashboard;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                      active
                        ? "bg-blue-950/60 text-blue-400"
                        : "text-slate-400 hover:bg-slate-800",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-800 bg-slate-900 px-2 py-1.5 lg:hidden">
        {topItems.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-md py-1 text-xs",
                active ? "text-blue-400" : "text-slate-500",
              )}
            >
              <Icon className="size-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {moreItems.length > 0 && (
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-md py-1 text-xs text-slate-500"
          >
            <MoreHorizontal className="size-5" />
            <span>More</span>
          </button>
        )}
      </nav>

      {/* Mobile "More" overflow sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-xl border-t border-slate-800 bg-slate-900 pb-4">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-200">More</h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex size-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="space-y-1 p-2">
              {moreItems.map((item) => {
                const Icon = ICONS[item.icon] ?? LayoutDashboard;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-blue-950/60 text-blue-400"
                        : "text-slate-400 hover:bg-slate-800",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
