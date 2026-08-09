import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Heart,
  Brain,
  Bone,
  Baby,
  Stethoscope,
  Eye,
  Ear,
  Activity,
  CalendarPlus,
  FileText,
  FlaskConical,
  Pill,
  Receipt,
  FolderOpen,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Shield,
  Users,
  Building2,
  Search,
} from "@/components/ui/icon";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site-config";
import { LandingNav } from "@/components/landing/landing-nav";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

const ROLE_DASHBOARD: Record<string, string> = {
  ADMIN: "/admin",
  DOCTOR: "/doctor",
  PATIENT: "/patient",
  RECEPTIONIST: "/receptionist",
  LAB_TECHNICIAN: "/lab",
};

// Fallback data when DB is empty (pre-seed)
const FALLBACK_DEPARTMENTS = [
  {
    id: "cardiology",
    name: "Cardiology",
    description:
      "Comprehensive heart care, from diagnostics to advanced surgical interventions.",
  },
  {
    id: "neurology",
    name: "Neurology",
    description: "Expert treatment for neurological and brain disorders.",
  },
  {
    id: "orthopedics",
    name: "Orthopedics",
    description: "Advanced joint replacement and sports injury treatments.",
  },
  {
    id: "pediatrics",
    name: "Pediatrics",
    description: "Compassionate care for infants, children, and adolescents.",
  },
  {
    id: "general-medicine",
    name: "General Medicine",
    description:
      "Primary healthcare for everyday illnesses and preventive care.",
  },
  {
    id: "dermatology",
    name: "Dermatology",
    description:
      "Skin, hair, and nail care with advanced dermatological treatments.",
  },
];

const DEPT_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Cardiology: Heart,
  Neurology: Brain,
  Orthopedics: Bone,
  Pediatrics: Baby,
  "General Medicine": Stethoscope,
  Dermatology: Activity,
  ENT: Ear,
  Ophthalmology: Eye,
  Gynecology: Activity,
};

const SERVICES = [
  {
    icon: CalendarPlus,
    title: "Appointment Booking",
    desc: "Book appointments online with your preferred doctor in minutes.",
  },
  {
    icon: FileText,
    title: "Digital Prescriptions",
    desc: "Access your prescriptions anytime, anywhere — no paper needed.",
  },
  {
    icon: FlaskConical,
    title: "Lab Reports Online",
    desc: "View and download your lab test results as soon as they're ready.",
  },
  {
    icon: Pill,
    title: "Pharmacy",
    desc: "In-house pharmacy with stock tracking and automatic dispensing.",
  },
  {
    icon: Receipt,
    title: "Billing & Insurance",
    desc: "Transparent invoicing with multiple payment options including UPI.",
  },
  {
    icon: FolderOpen,
    title: "Medical Records",
    desc: "Your complete medical history, securely stored and always accessible.",
  },
];

const STATS = [
  { icon: Users, value: "12,000+", label: "Patients Served" },
  { icon: Stethoscope, value: "50+", label: "Expert Doctors" },
  { icon: Building2, value: "15+", label: "Departments" },
  { icon: Activity, value: "24/7", label: "Emergency Care" },
];

const STEPS = [
  {
    icon: Search,
    title: "Find a Doctor",
    desc: "Browse departments and choose a specialist that fits your needs.",
  },
  {
    icon: CalendarPlus,
    title: "Book Appointment",
    desc: "Select a convenient time slot and confirm your appointment instantly.",
  },
  {
    icon: CheckCircle2,
    title: "Get Consultation",
    desc: "Visit the hospital, check in, and receive expert medical care.",
  },
];

const TRUST_BADGES = [
  { icon: Shield, label: "NABH Accredited" },
  { icon: Activity, label: "24/7 Emergency" },
  { icon: Users, label: "50+ Specialists" },
];

const brandName = (siteConfig.name ?? "CarePoint Hospital").split(" ")[0];

export default async function LandingPage() {
  // Redirect authenticated users to their role dashboard
  const session = await auth();
  if (session?.user?.role) {
    const dest = ROLE_DASHBOARD[session.user.role];
    if (dest) redirect(dest);
  }

  // Fetch live data — public reads, no auth required
  let departments = FALLBACK_DEPARTMENTS;
  let doctors: {
    id: string;
    name: string;
    specialization: string;
    deptName: string;
  }[] = [];

  try {
    const [deptRows, docRows] = await Promise.all([
      prisma.department.findMany({ take: 6, orderBy: { name: "asc" } }),
      prisma.doctorProfile.findMany({
        take: 4,
        include: {
          user: { select: { name: true } },
          department: { select: { name: true } },
        },
      }),
    ]);

    if (deptRows.length > 0) {
      departments = deptRows.map((d) => ({
        id: d.id,
        name: d.name,
        description:
          d.description ?? "Expert care from experienced specialists.",
      }));
    }

    if (docRows.length > 0) {
      doctors = docRows.map((d) => ({
        id: d.id,
        name: d.user.name ?? "Doctor",
        specialization: d.specialization,
        deptName: d.department.name,
      }));
    }
  } catch {
    // DB not connected — use fallback data
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav brand={brandName} />

      <main className="pt-16">
        {/* 1. HERO */}
        <section className="relative flex min-h-[80vh] items-center overflow-hidden px-4 md:px-8">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-7xl">
            <div className="max-w-2xl space-y-6 py-20">
              {/* Trust badges */}
              <div className="flex flex-wrap gap-3">
                {TRUST_BADGES.map((badge) => (
                  <div
                    key={badge.label}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 backdrop-blur"
                  >
                    <badge.icon className="size-3.5 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {badge.label}
                    </span>
                  </div>
                ))}
              </div>

              <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
                Your Health,
                <br />
                <span className="text-primary">Our Priority</span>
              </h1>

              <p className="max-w-xl text-lg text-muted-foreground">
                {siteConfig.description}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button render={<Link href="/login" />} size="lg">
                  Book an Appointment
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  render={<a href="#departments" />}
                  variant="outline"
                  size="lg"
                >
                  Explore Departments
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 2. STATS */}
        <section className="border-y border-border bg-muted/30 px-4 py-12 md:px-8">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map((stat) => (
              <Card
                key={stat.label}
                className="items-center text-center hover:ring-primary/30"
              >
                <CardContent className="flex flex-col items-center p-6">
                  <stat.icon className="mb-3 size-6 text-primary" />
                  <span className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </span>
                  <span className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 3. DEPARTMENTS */}
        <section
          id="departments"
          className="mx-auto max-w-7xl px-4 py-20 md:px-8"
        >
          <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Centers of Excellence
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Specialized care delivered by leading experts utilizing advanced
                technology.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept, i) => {
              const Icon = DEPT_ICONS[dept.name] ?? Stethoscope;
              const isFeatured = i === 0;
              return (
                <Link
                  key={dept.id}
                  href={`/login?redirect=/book&dept=${dept.id}`}
                  className={`group flex flex-col justify-between rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 ${
                    isFeatured ? "md:col-span-2" : ""
                  }`}
                >
                  <div>
                    <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {dept.name}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {dept.description}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary">
                    Learn More
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 4. DOCTORS */}
        <section
          id="doctors"
          className="border-y border-border bg-muted/20 px-4 py-20 md:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Meet Our Doctors
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Experienced specialists dedicated to your health and well-being.
              </p>
            </div>

            {doctors.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {doctors.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/login?redirect=/book&doctor=${doc.id}`}
                    className="group rounded-xl border border-border bg-card p-6 text-center transition-all hover:border-primary/50"
                  >
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted text-xl font-bold text-primary">
                      {doc.name[0] ?? "D"}
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      {doc.name}
                    </h3>
                    <p className="mt-1 text-sm text-primary">
                      {doc.specialization}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {doc.deptName}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    name: "Dr. Rajesh Mehta",
                    spec: "Cardiologist",
                    dept: "Cardiology",
                  },
                  {
                    name: "Dr. Priya Iyer",
                    spec: "Neurologist",
                    dept: "Neurology",
                  },
                  {
                    name: "Dr. Vikram Singh",
                    spec: "Orthopedic Surgeon",
                    dept: "Orthopedics",
                  },
                  {
                    name: "Dr. Anjali Sharma",
                    spec: "Pediatrician",
                    dept: "Pediatrics",
                  },
                ].map((doc) => (
                  <div
                    key={doc.name}
                    className="rounded-xl border border-border bg-card p-6 text-center"
                  >
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted text-xl font-bold text-primary">
                      {doc.name[4]}
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      {doc.name}
                    </h3>
                    <p className="mt-1 text-sm text-primary">{doc.spec}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {doc.dept}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 5. SERVICES */}
        <section id="services" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Our Services
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Comprehensive healthcare services, all under one roof.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <Card key={service.title} className="hover:ring-primary/30">
                <CardContent className="p-6">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <service.icon className="size-6" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {service.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 6. HOW IT WORKS */}
        <section className="border-y border-border bg-muted/20 px-4 py-20 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                How It Works
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Getting started is simple — three easy steps.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <div
                  key={step.title}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Connecting line */}
                  {i < STEPS.length - 1 && (
                    <div className="absolute left-1/2 top-8 hidden h-0.5 w-full bg-border md:block" />
                  )}
                  <div className="relative z-10 mb-4 flex size-16 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                    <step.icon className="size-7" />
                  </div>
                  <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    Step {i + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. CONTACT */}
        <section id="contact" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Get in Touch
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Have questions? We&apos;re here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Contact info */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Phone className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Phone</p>
                  <p className="text-sm text-muted-foreground">
                    {siteConfig.contact.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {siteConfig.contact.email}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Address
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {siteConfig.contact.address}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Operating Hours
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {siteConfig.hours.weekday}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {siteConfig.hours.weekend}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact form (visual only — no backend for MVP landing) */}
            <Card>
              <CardContent className="p-6">
                <form className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name">Name</Label>
                    <Input
                      id="contact-name"
                      type="text"
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-phone">Phone</Label>
                    <Input
                      id="contact-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-message">Message</Label>
                    <Textarea
                      id="contact-message"
                      rows={4}
                      placeholder="How can we help you?"
                    />
                  </div>
                  <Button type="button" className="w-full" size="lg">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 8. FOOTER */}
        <footer className="border-t border-border bg-background px-4 py-12 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {/* Brand */}
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
                    {brandName[0]}
                  </div>
                  <span className="font-bold text-primary">
                    {siteConfig.name}
                  </span>
                </div>
                <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                  {siteConfig.tagline}
                </p>
              </div>

              {/* Quick links */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-foreground">
                  Quick Links
                </h4>
                <ul className="space-y-2">
                  <li>
                    <a
                      href="#departments"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      Departments
                    </a>
                  </li>
                  <li>
                    <a
                      href="#doctors"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      Doctors
                    </a>
                  </li>
                  <li>
                    <a
                      href="#services"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      Services
                    </a>
                  </li>
                  <li>
                    <a
                      href="#contact"
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      Contact
                    </a>
                  </li>
                </ul>
              </div>

              {/* Departments */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-foreground">
                  Departments
                </h4>
                <ul className="space-y-2">
                  {departments.slice(0, 5).map((d) => (
                    <li key={d.id}>
                      <a
                        href="#departments"
                        className="text-sm text-muted-foreground hover:text-primary"
                      >
                        {d.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-foreground">
                  Contact
                </h4>
                <ul className="space-y-2">
                  <li className="text-sm text-muted-foreground">
                    {siteConfig.contact.phone}
                  </li>
                  <li className="text-sm text-muted-foreground">
                    {siteConfig.contact.email}
                  </li>
                  <li className="text-sm text-muted-foreground">
                    {siteConfig.contact.address}
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-10 border-t border-border pt-6 text-center">
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} {siteConfig.name}. All rights
                reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
