"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, CalendarPlus } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { label: "Departments", href: "#departments" },
  { label: "Doctors", href: "#doctors" },
  { label: "Services", href: "#services" },
  { label: "Contact", href: "#contact" },
];

export function LandingNav({ brand }: { brand: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
            {brand[0] ?? "C"}
          </div>
          <span className="text-lg font-bold text-primary">{brand}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* CTA + mobile toggle */}
        <div className="flex items-center gap-3">
          <Button render={<Link href="/login" />} className="hidden sm:flex">
            <CalendarPlus className="size-4" />
            Book Appointment
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen((o) => !o)}
            className="md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="space-y-1 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <Button
              render={<Link href="/login" onClick={() => setOpen(false)} />}
              className="mt-2 w-full"
            >
              <CalendarPlus className="size-4" />
              Book Appointment
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
