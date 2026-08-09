import Link from "next/link";
import {
  Heart, Brain, Bone, Baby, Stethoscope, Eye, Ear, Activity,
  CalendarPlus, FileText, FlaskConical, Pill,
  Receipt, FolderOpen, Phone, Mail, MapPin, Clock,
  ArrowRight, ChevronRight, CheckCircle2, Shield, Users, Building2,
  Search,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/lib/site-config";
import { LandingNav } from "@/components/landing/landing-nav";

// Fallback data when DB is empty (pre-seed)
const FALLBACK_DEPARTMENTS = [
  { id: "cardiology", name: "Cardiology", description: "Comprehensive heart care, from diagnostics to advanced surgical interventions." },
  { id: "neurology", name: "Neurology", description: "Expert treatment for neurological and brain disorders." },
  { id: "orthopedics", name: "Orthopedics", description: "Advanced joint replacement and sports injury treatments." },
  { id: "pediatrics", name: "Pediatrics", description: "Compassionate care for infants, children, and adolescents." },
  { id: "general-medicine", name: "General Medicine", description: "Primary healthcare for everyday illnesses and preventive care." },
  { id: "dermatology", name: "Dermatology", description: "Skin, hair, and nail care with advanced dermatological treatments." },
];

const DEPT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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
  { icon: CalendarPlus, title: "Appointment Booking", desc: "Book appointments online with your preferred doctor in minutes." },
  { icon: FileText, title: "Digital Prescriptions", desc: "Access your prescriptions anytime, anywhere — no paper needed." },
  { icon: FlaskConical, title: "Lab Reports Online", desc: "View and download your lab test results as soon as they're ready." },
  { icon: Pill, title: "Pharmacy", desc: "In-house pharmacy with stock tracking and automatic dispensing." },
  { icon: Receipt, title: "Billing & Insurance", desc: "Transparent invoicing with multiple payment options including UPI." },
  { icon: FolderOpen, title: "Medical Records", desc: "Your complete medical history, securely stored and always accessible." },
];

const STATS = [
  { icon: Users, value: "12,000+", label: "Patients Served" },
  { icon: Stethoscope, value: "50+", label: "Expert Doctors" },
  { icon: Building2, value: "15+", label: "Departments" },
  { icon: Activity, value: "24/7", label: "Emergency Care" },
];

const STEPS = [
  { icon: Search, title: "Find a Doctor", desc: "Browse departments and choose a specialist that fits your needs." },
  { icon: CalendarPlus, title: "Book Appointment", desc: "Select a convenient time slot and confirm your appointment instantly." },
  { icon: CheckCircle2, title: "Get Consultation", desc: "Visit the hospital, check in, and receive expert medical care." },
];

const TRUST_BADGES = [
  { icon: Shield, label: "NABH Accredited" },
  { icon: Activity, label: "24/7 Emergency" },
  { icon: Users, label: "50+ Specialists" },
];

const brandName = (siteConfig.name ?? "CarePoint Hospital").split(" ")[0];

export default async function LandingPage() {
  // Fetch live data — public reads, no auth required
  let departments = FALLBACK_DEPARTMENTS;
  let doctors: { id: string; name: string; specialization: string; deptName: string }[] = [];

  try {
    const [deptRows, docRows] = await Promise.all([
      prisma.department.findMany({ take: 6, orderBy: { name: "asc" } }),
      prisma.doctorProfile.findMany({
        take: 4,
        include: { user: { select: { name: true } }, department: { select: { name: true } } },
      }),
    ]);

    if (deptRows.length > 0) {
      departments = deptRows.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description ?? "Expert care from experienced specialists.",
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <LandingNav brand={brandName} />

      <main className="pt-16">
        {/* 1. HERO */}
        <section className="relative flex min-h-[80vh] items-center overflow-hidden px-4 md:px-8">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-950 to-slate-950" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-7xl">
            <div className="max-w-2xl space-y-6 py-20">
              {/* Trust badges */}
              <div className="flex flex-wrap gap-3">
                {TRUST_BADGES.map((badge) => (
                  <div
                    key={badge.label}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 backdrop-blur"
                  >
                    <badge.icon className="size-3.5 text-teal-400" />
                    <span className="text-xs font-medium text-slate-300">{badge.label}</span>
                  </div>
                ))}
              </div>

              <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-100 md:text-5xl lg:text-6xl">
                Your Health,
                <br />
                <span className="text-blue-400">Our Priority</span>
              </h1>

              <p className="max-w-xl text-lg text-slate-300">
                {siteConfig.description}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-blue-500"
                >
                  Book an Appointment
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#departments"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-6 py-3 text-sm font-semibold text-slate-200 backdrop-blur transition-all hover:bg-slate-800"
                >
                  Explore Departments
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 2. STATS */}
        <section className="border-y border-slate-800 bg-slate-900/50 px-4 py-12 md:px-8">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center rounded-xl border border-slate-800 bg-slate-900 p-6 text-center transition-colors hover:border-teal-500/50"
              >
                <stat.icon className="mb-3 size-6 text-teal-400" />
                <span className="text-2xl font-bold text-slate-100">{stat.value}</span>
                <span className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 3. DEPARTMENTS */}
        <section id="departments" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <div className="mb-10 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold text-slate-100 md:text-3xl">Centers of Excellence</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Specialized care delivered by leading experts utilizing advanced technology.
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
                  className={`group flex flex-col justify-between rounded-xl border p-6 transition-all hover:border-blue-500/50 ${
                    isFeatured ? "border-slate-700 bg-slate-800/50 md:col-span-2" : "border-slate-800 bg-slate-900"
                  }`}
                >
                  <div>
                    <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-blue-950/60 text-blue-400">
                      <Icon className="size-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-100">{dept.name}</h3>
                    <p className="mt-2 text-sm text-slate-400">{dept.description}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-400">
                    Learn More
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 4. DOCTORS */}
        <section id="doctors" className="border-y border-slate-800 bg-slate-900/30 px-4 py-20 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-100 md:text-3xl">Meet Our Doctors</h2>
              <p className="mt-2 text-sm text-slate-400">
                Experienced specialists dedicated to your health and well-being.
              </p>
            </div>

            {doctors.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {doctors.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/login?redirect=/book&doctor=${doc.id}`}
                    className="group rounded-xl border border-slate-800 bg-slate-900 p-6 text-center transition-all hover:border-blue-500/50"
                  >
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-800 text-xl font-bold text-blue-400">
                      {doc.name[0] ?? "D"}
                    </div>
                    <h3 className="text-base font-semibold text-slate-100">{doc.name}</h3>
                    <p className="mt-1 text-sm text-teal-400">{doc.specialization}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{doc.deptName}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { name: "Dr. Rajesh Mehta", spec: "Cardiologist", dept: "Cardiology" },
                  { name: "Dr. Priya Iyer", spec: "Neurologist", dept: "Neurology" },
                  { name: "Dr. Vikram Singh", spec: "Orthopedic Surgeon", dept: "Orthopedics" },
                  { name: "Dr. Anjali Sharma", spec: "Pediatrician", dept: "Pediatrics" },
                ].map((doc) => (
                  <div
                    key={doc.name}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center"
                  >
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-slate-800 text-xl font-bold text-blue-400">
                      {doc.name[4]}
                    </div>
                    <h3 className="text-base font-semibold text-slate-100">{doc.name}</h3>
                    <p className="mt-1 text-sm text-teal-400">{doc.spec}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{doc.dept}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 5. SERVICES */}
        <section id="services" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-100 md:text-3xl">Our Services</h2>
            <p className="mt-2 text-sm text-slate-400">
              Comprehensive healthcare services, all under one roof.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <div
                key={service.title}
                className="rounded-xl border border-slate-800 bg-slate-900 p-6 transition-all hover:border-blue-500/50"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-teal-950/40 text-teal-400">
                  <service.icon className="size-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-100">{service.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{service.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. HOW IT WORKS */}
        <section className="border-y border-slate-800 bg-slate-900/30 px-4 py-20 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-slate-100 md:text-3xl">How It Works</h2>
              <p className="mt-2 text-sm text-slate-400">
                Getting started is simple — three easy steps.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <div key={step.title} className="relative flex flex-col items-center text-center">
                  {/* Connecting line */}
                  {i < STEPS.length - 1 && (
                    <div className="absolute left-1/2 top-8 hidden h-0.5 w-full bg-slate-700 md:block" />
                  )}
                  <div className="relative z-10 mb-4 flex size-16 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                    <step.icon className="size-7" />
                  </div>
                  <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
                    Step {i + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-slate-100">{step.title}</h3>
                  <p className="mt-2 max-w-xs text-sm text-slate-400">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. CONTACT */}
        <section id="contact" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-100 md:text-3xl">Get in Touch</h2>
            <p className="mt-2 text-sm text-slate-400">
              Have questions? We&apos;re here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Contact info */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-950/60 text-blue-400">
                  <Phone className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Phone</p>
                  <p className="text-sm text-slate-400">{siteConfig.contact.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-950/60 text-blue-400">
                  <Mail className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Email</p>
                  <p className="text-sm text-slate-400">{siteConfig.contact.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-950/60 text-blue-400">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Address</p>
                  <p className="text-sm text-slate-400">{siteConfig.contact.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-950/60 text-blue-400">
                  <Clock className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Operating Hours</p>
                  <p className="text-sm text-slate-400">{siteConfig.hours.weekday}</p>
                  <p className="text-sm text-slate-400">{siteConfig.hours.weekend}</p>
                </div>
              </div>
            </div>

            {/* Contact form (visual only — no backend for MVP landing) */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <form className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Name</label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">Message</label>
                  <textarea
                    rows={4}
                    placeholder="How can we help you?"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-500"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* 8. FOOTER */}
        <footer className="border-t border-slate-800 bg-slate-950 px-4 py-12 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {/* Brand */}
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
                    {brandName[0]}
                  </div>
                  <span className="font-bold text-blue-400">{siteConfig.name}</span>
                </div>
                <p className="mt-3 max-w-xs text-sm text-slate-500">{siteConfig.tagline}</p>
              </div>

              {/* Quick links */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-slate-200">Quick Links</h4>
                <ul className="space-y-2">
                  <li><a href="#departments" className="text-sm text-slate-500 hover:text-teal-400">Departments</a></li>
                  <li><a href="#doctors" className="text-sm text-slate-500 hover:text-teal-400">Doctors</a></li>
                  <li><a href="#services" className="text-sm text-slate-500 hover:text-teal-400">Services</a></li>
                  <li><a href="#contact" className="text-sm text-slate-500 hover:text-teal-400">Contact</a></li>
                </ul>
              </div>

              {/* Departments */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-slate-200">Departments</h4>
                <ul className="space-y-2">
                  {departments.slice(0, 5).map((d) => (
                    <li key={d.id}>
                      <a href="#departments" className="text-sm text-slate-500 hover:text-teal-400">{d.name}</a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-slate-200">Contact</h4>
                <ul className="space-y-2">
                  <li className="text-sm text-slate-500">{siteConfig.contact.phone}</li>
                  <li className="text-sm text-slate-500">{siteConfig.contact.email}</li>
                  <li className="text-sm text-slate-500">{siteConfig.contact.address}</li>
                </ul>
              </div>
            </div>

            <div className="mt-10 border-t border-slate-800 pt-6 text-center">
              <p className="text-xs text-slate-600">
                © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
