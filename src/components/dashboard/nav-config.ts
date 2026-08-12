import type { UserRole } from "@/types/next-auth";

export interface NavItem {
  label: string;
  /** Compact label for the mobile bottom tab bar. */
  shortLabel: string;
  href: string;
  icon: string;
}

// Role → route prefix (matches middleware roleRouteMap)
export const ROLE_ROUTE_PREFIX: Record<UserRole, string> = {
  ADMIN: "/admin",
  DOCTOR: "/doctor",
  PATIENT: "/patient",
  RECEPTIONIST: "/receptionist",
  LAB_TECHNICIAN: "/lab",
};

// Nav items per role — from #10 design spec.
// Most sub-routes don't exist yet; they'll be built in downstream tickets.
export const NAV_PER_ROLE: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", shortLabel: "Home", href: "/admin", icon: "LayoutDashboard" },
    { label: "Departments", shortLabel: "Depts", href: "/admin/departments", icon: "Building2" },
    { label: "Doctors", shortLabel: "Doctors", href: "/admin/doctors", icon: "Stethoscope" },
    { label: "Patients", shortLabel: "Patients", href: "/admin/patients", icon: "Users" },
    { label: "Medicines", shortLabel: "Meds", href: "/admin/medicines", icon: "Pill" },
    { label: "Test Types", shortLabel: "Tests", href: "/admin/test-types", icon: "TestTube" },
    { label: "Billing Reports", shortLabel: "Billing", href: "/admin/billing", icon: "Receipt" },
    { label: "Settings", shortLabel: "Settings", href: "/admin/settings", icon: "Settings" },
  ],
  DOCTOR: [
    { label: "Dashboard", shortLabel: "Home", href: "/doctor", icon: "LayoutDashboard" },
    {
      label: "My Appointments",
      shortLabel: "Appts",
      href: "/doctor/appointments",
      icon: "CalendarClock",
    },
    { label: "My Patients", shortLabel: "Patients", href: "/doctor/patients", icon: "Users" },
    { label: "Prescriptions", shortLabel: "Rx", href: "/doctor/prescriptions", icon: "FileText" },
    { label: "Lab Results", shortLabel: "Labs", href: "/doctor/lab-results", icon: "TestTube" },
    { label: "Chat", shortLabel: "Chat", href: "/doctor/chat", icon: "MessageSquare" },
  ],
  PATIENT: [
    { label: "Dashboard", shortLabel: "Home", href: "/patient", icon: "LayoutDashboard" },
    { label: "Book Appointment", shortLabel: "Book", href: "/patient/book", icon: "CalendarPlus" },
    {
      label: "My Appointments",
      shortLabel: "Appts",
      href: "/patient/appointments",
      icon: "CalendarClock",
    },
    {
      label: "Prescriptions",
      shortLabel: "Rx",
      href: "/patient/prescriptions",
      icon: "FileText",
    },
    { label: "Lab Results", shortLabel: "Labs", href: "/patient/lab-results", icon: "TestTube" },
    { label: "Medical History", shortLabel: "History", href: "/patient/history", icon: "History" },
    { label: "Chat", shortLabel: "Chat", href: "/patient/chat", icon: "MessageSquare" },
  ],
  RECEPTIONIST: [
    { label: "Dashboard", shortLabel: "Home", href: "/receptionist", icon: "LayoutDashboard" },
    {
      label: "Today's Appointments",
      shortLabel: "Today",
      href: "/receptionist/appointments",
      icon: "CalendarClock",
    },
    {
      label: "Book Appointment",
      shortLabel: "Book",
      href: "/receptionist/book",
      icon: "CalendarPlus",
    },
    { label: "Patients", shortLabel: "Patients", href: "/receptionist/patients", icon: "Users" },
    { label: "Lab Orders", shortLabel: "Lab", href: "/receptionist/lab-orders", icon: "TestTube" },
    { label: "Billing", shortLabel: "Billing", href: "/receptionist/billing", icon: "Receipt" },
    { label: "Chat", shortLabel: "Chat", href: "/receptionist/chat", icon: "MessageSquare" },
  ],
  LAB_TECHNICIAN: [
    { label: "Dashboard", shortLabel: "Home", href: "/lab", icon: "LayoutDashboard" },
    { label: "Test Queue", shortLabel: "Queue", href: "/lab/queue", icon: "ListTodo" },
    { label: "Completed Tests", shortLabel: "Done", href: "/lab/completed", icon: "CheckCircle2" },
    { label: "Chat", shortLabel: "Chat", href: "/lab/chat", icon: "MessageSquare" },
  ],
};
