import type { UserRole } from "@/types/next-auth";

export interface NavItem {
  label: string;
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
    { label: "Dashboard", href: "/admin", icon: "LayoutDashboard" },
    { label: "Departments", href: "/admin/departments", icon: "Building2" },
    { label: "Doctors", href: "/admin/doctors", icon: "Stethoscope" },
    { label: "Patients", href: "/admin/patients", icon: "Users" },
    { label: "Medicines", href: "/admin/medicines", icon: "Pill" },
    { label: "Test Types", href: "/admin/test-types", icon: "TestTube" },
    { label: "Billing Reports", href: "/admin/billing", icon: "Receipt" },
    { label: "Settings", href: "/admin/settings", icon: "Settings" },
  ],
  DOCTOR: [
    { label: "Dashboard", href: "/doctor", icon: "LayoutDashboard" },
    {
      label: "My Appointments",
      href: "/doctor/appointments",
      icon: "CalendarClock",
    },
    { label: "My Patients", href: "/doctor/patients", icon: "Users" },
    { label: "Prescriptions", href: "/doctor/prescriptions", icon: "FileText" },
    { label: "Lab Results", href: "/doctor/lab-results", icon: "TestTube" },
    { label: "Chat", href: "/doctor/chat", icon: "MessageSquare" },
  ],
  PATIENT: [
    { label: "Dashboard", href: "/patient", icon: "LayoutDashboard" },
    { label: "Book Appointment", href: "/patient/book", icon: "CalendarPlus" },
    {
      label: "My Appointments",
      href: "/patient/appointments",
      icon: "CalendarClock",
    },
    {
      label: "Prescriptions",
      href: "/patient/prescriptions",
      icon: "FileText",
    },
    { label: "Lab Results", href: "/patient/lab-results", icon: "TestTube" },
    { label: "Medical History", href: "/patient/history", icon: "History" },
    { label: "Chat", href: "/patient/chat", icon: "MessageSquare" },
  ],
  RECEPTIONIST: [
    { label: "Dashboard", href: "/receptionist", icon: "LayoutDashboard" },
    {
      label: "Today's Appointments",
      href: "/receptionist/appointments",
      icon: "CalendarClock",
    },
    {
      label: "Book Appointment",
      href: "/receptionist/book",
      icon: "CalendarPlus",
    },
    { label: "Register Patient", href: "/receptionist", icon: "UserPlus" },
    { label: "Search Patient", href: "/receptionist", icon: "Search" },
    { label: "Billing", href: "/receptionist/billing", icon: "Receipt" },
    { label: "Chat", href: "/receptionist/chat", icon: "MessageSquare" },
  ],
  LAB_TECHNICIAN: [
    { label: "Dashboard", href: "/lab", icon: "LayoutDashboard" },
    { label: "Test Queue", href: "/lab/queue", icon: "ListTodo" },
    { label: "Completed Tests", href: "/lab/completed", icon: "CheckCircle2" },
    { label: "Chat", href: "/lab/chat", icon: "MessageSquare" },
  ],
};
