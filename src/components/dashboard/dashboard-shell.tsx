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
} from "@/components/ui/icon";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-sidebar transition-all lg:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
            {brand[0] ?? "C"}
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-primary">{brand}</span>
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
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon
                  className="size-4 shrink-0"
                 
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
              {(userName || roleLabel)[0]}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {userName || roleLabel}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {userEmail}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 md:px-6">
          {/* Sidebar toggle (desktop) */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex"
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </Button>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>

          <h2 className="text-sm font-semibold text-foreground">
            {roleLabel} Dashboard
          </h2>

          {/* Search (desktop) */}
          <div className="ml-auto hidden items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground md:flex">
            <Search className="size-4" /> Search…
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
          </Button>

          {/* User dropdown */}
          <div className="relative" ref={userMenuRef}>
            <Button
              variant="ghost"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 p-1"
            >
              <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                {(userName || roleLabel)[0]}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-medium text-foreground">
                  {userName}
                </p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </Button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-popover py-1 shadow-xl">
                <div className="border-b border-border px-3 py-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {userName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {userEmail}
                  </p>
                </div>
                <Link
                  href="/api/auth/signout"
                  className="mt-1 flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
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
          <div className="absolute left-0 top-0 h-full w-64 border-r border-border bg-sidebar">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
                  {brand[0] ?? "C"}
                </div>
                <span className="text-lg font-bold text-primary">{brand}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileNavOpen(false)}
              >
                <X className="size-5" />
              </Button>
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
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon
                      className="size-4 shrink-0"
                     
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-card px-2 py-1.5 lg:hidden">
        {topItems.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-md py-1 text-xs",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {moreItems.length > 0 && (
          <Button
            variant="ghost"
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-1 text-xs text-muted-foreground h-auto"
          >
            <MoreHorizontal className="size-5" />
            <span>More</span>
          </Button>
        )}
      </nav>

      {/* Mobile "More" overflow sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-xl border-t border-border bg-card pb-4">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">More</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMoreOpen(false)}
              >
                <X className="size-5" />
              </Button>
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
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon
                      className="size-4 shrink-0"
                     
                    />
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
