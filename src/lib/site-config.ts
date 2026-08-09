/**
 * Hospital identity configuration.
 *
 * For the MVP this is a plain object. In a future multi-tenant setup
 * these values could come from a database or environment variables.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_HOSPITAL_NAME ?? "CarePoint Hospital",
  tagline:
    process.env.NEXT_PUBLIC_HOSPITAL_TAGLINE ?? "Your Health, Our Priority",
  description:
    "Comprehensive healthcare with experienced specialists. Book your appointment online, view lab results, and manage prescriptions.",

  contact: {
    phone: process.env.NEXT_PUBLIC_HOSPITAL_PHONE ?? "+91 98765 43210",
    email: process.env.NEXT_PUBLIC_HOSPITAL_EMAIL ?? "info@carepointhospital.in",
    address:
      process.env.NEXT_PUBLIC_HOSPITAL_ADDRESS ??
      "123 Health Avenue, Medical District, Bengaluru, Karnataka 560001",
  },

  hours: {
    weekday: "Mon–Sat: 8:00 AM – 8:00 PM",
    weekend: "Sun: 9:00 AM – 1:00 PM (Emergency Only)",
  },
} as const;
