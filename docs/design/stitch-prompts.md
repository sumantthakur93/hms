# Stitch Design Prompts

Copy-paste prompts for [Google Stitch](https://stitch.withgoogle.com/) to generate UI mockups for the HMS app. One prompt per Stitch session. Source-of-truth for content: the [wayfinder map (#1)](https://github.com/sumantthakur93/hms/issues/1) and the tickets each screen cites.

## How to use

1. Pick a screen prompt below.
2. Copy the **Style Preamble** block, then the chosen screen's block, and paste both into Stitch as one prompt.
3. The screens are ordered: lock the visual language with the **Landing Page** and **App Shell** first, then run the role dashboards, then the deeper flows.

## Style Preamble (prepend to every screen prompt)

```
Dark-mode-only UI for an Indian Hospital Management System. No light mode, no theme toggle. Palette: slate-950 page background, slate-900 card/section surfaces, slate-800 borders, slate-100 headings, slate-300 body text, slate-500 muted text. Primary blue-600 (#1e40af), accent teal-500 (#0d9488); amber for warnings, red for danger/urgent, green for success. Stat cards: slate-900 with a colored left-border accent per metric. shadcn/ui-style components (cards, dialogs, sheets, tabs, data tables, command palettes), Lucide icons, rounded corners, generous spacing. Mobile-first and responsive. Indian Rupee (₹); dates DD MMM YYYY; times 12-hour IST. Accessible contrast.
```

---

## 1. Public Landing Page — #17 / design #15

```
Single-page scroll landing page for "CarePoint Hospital", tagline "Your Health, Our Priority". Config-driven hospital identity (name, tagline, address, phone, email, logo). 9 sections top → bottom:

1. Navbar — hospital name/logo left, anchor links (Departments, Doctors, Services, Contact), "Book Appointment" CTA → /login. Mobile: hamburger → slide-out drawer with all links + CTA.
2. Hero — headline "Your Health, Our Priority", subtext "Comprehensive healthcare with experienced specialists. Book your appointment in minutes.", hero illustration, primary CTA "Book an Appointment" → /login, secondary "Explore Departments" (smooth-scrolls to Departments).
3. Stats bar — compact row: Years of Service, Patients Served, Doctors on Staff, Departments.
4. Departments — grid of department cards (icon, name, short description, consultation fee ₹). Click → /login?redirect=/book&dept={id}. Mobile: 2 columns; desktop: 3–4.
5. Doctors — "Meet Our Doctors" — cards with avatar/initials, name, specialization, department. Static (no search/filter). Click → /login?redirect=/book&doctor={id}. Mobile: single column; desktop: 3–4 per row.
6. Services — feature highlights with icons: Appointment Booking, Digital Prescriptions, Lab Reports Online, AI Health Assistant.
7. How It Works — 3-step visual: Search Doctor → Book Appointment → Get Consultation.
8. Contact — address, phone, email, operating hours. No map embed.
9. Footer — quick links, copyright, social media icons. slate-950.

Show the full page as one long scroll mockup, plus a mobile-width view of hero + navbar + departments.
```

## 2. Auth — Login

```
Login page for CarePoint Hospital. Centered card on a slate-950 background with a subtle hospital motif. Card: hospital logo + name top, heading "Welcome back", email field, password field (show/hide toggle), "Forgot password?" link, "Sign In" primary button (full width, blue-600), divider "or", "Create an account" link → Sign Up. Small note: "Role-based access — your dashboard loads automatically after login." No role picker (role is implicit from the account). Show desktop and mobile.
```

## 3. Auth — Patient Sign Up — #13

```
Patient Sign Up page for CarePoint Hospital. Two-column on desktop (form left, reassuring illustration + value props right), single column on mobile. Form fields: First name*, Last name*, Phone* (+91 prefix), Email, Password (strength indicator), Confirm password. Collapsible "More about you" optional section: Date of birth, Gender (select), Blood group (select), Address (textarea), Emergency contact name/phone/relationship, Allergies (free text), Medical history notes (free text). Submit "Create Account" (blue-600). "Already have an account? Sign in" link. Show a duplicate-phone warning state: amber banner under the phone field — "A patient with this phone number already exists. If this is a new person in the same family, you can continue." with "Continue anyway" / "Cancel" buttons. Show default and warning states.
```

## 4. App Shell — Sidebar + Header (role-based) — #10

```
Authenticated app shell: collapsible left sidebar + top header + scrollable main content area. Mobile: sidebar collapses to a bottom tab bar (top 4–5 items) with a "More" overflow sheet for the rest.

Header (all roles): hospital logo + name left, then breadcrumb; right side — search bar, notification bell with red dot, user avatar + name + role badge, profile/logout dropdown.

Show 5 sidebar variants side by side, each labeled with its role. Use a Lucide icon per item; active item highlighted with a left accent bar + slate-800 background.

ADMIN: Dashboard, Departments, Doctors, Patients, Medicines, Test Types, Billing Reports, Settings.
DOCTOR: Dashboard, My Appointments, My Patients, Prescriptions, Lab Results, Chat.
PATIENT: Dashboard, Book Appointment, My Appointments, Prescriptions, Lab Results, Medical History, Chat.
RECEPTIONIST: Dashboard, Today's Appointments, Register Patient, Search Patient, Billing, Chat.
LAB TECHNICIAN: Dashboard, Test Queue, Completed Tests, Chat.

"Chat" (AI chatbot) appears for all roles. Show the desktop layout and one mobile bottom-tab-bar example.
```

## 5. Admin Dashboard — #10

```
Admin dashboard. Top stats row — 4 cards (slate-900, colored left-border accent each): Total Patients, Today's Appointments, Active Doctors, Pending Invoices.
Row 2: Today's Revenue (large number, ₹) | Monthly Revenue Trend (sparkline).
Row 3: Recent Appointments table (last 5: patient, doctor, time, status badge) | Low Stock Alerts card (medicines below reorder level — name, current qty in red, reorder level, "Restock" button; amber banner if any).
Row 4: Department Breakdown (horizontal bar chart: appointments per department) | Recent Invoices table (last 5: invoice #, patient, amount ₹, status badge DRAFT slate / ISSUED blue / PAID green / CANCELLED red, date).
Show desktop (multi-column) and mobile (stacked).
```

## 6. Doctor Dashboard — #10

```
Doctor dashboard. Top stats row — 3 cards: Today's Appointments, Patients Seen Today, Pending Lab Results.
Main: Today's Schedule — timeline/list of today's appointments. Each row: time (12-hr IST), patient name, MRN (e.g. MRN-00001), status badge. Status colors: CONFIRMED blue, CHECKED_IN amber, IN_CONSULTATION indigo, COMPLETED green, CANCELLED slate, NO_SHOW red. A CHECKED_IN row has a primary "Start Consultation" button (blue-600). A COMPLETED row has a "View" link.
Side panel: Upcoming Appointments (next 3 days, compact) | Recent Patients (last 5: name, MRN, last visit date, click → patient profile).
Show desktop (main + side panel) and mobile (stacked).
```

## 7. Consultation Screen — Doctor — #6 / #10

```
Doctor's Consultation screen. Two-pane on desktop (collapses to stacked tabs on mobile). Top bar: patient name + MRN + age/gender + "Back to appointments" + a "24h edit window" indicator showing time remaining to edit.

Left pane — "Patient Timeline" tabs:
- Past Consultations: list (date, diagnosis, doctor), expandable to symptoms/notes/vitals.
- Prescriptions: list (date, items count), expandable to medicines + dosage, "Download PDF".
- Lab Results: list (date, test type, status), expandable to parameter table.
- Patient Info: demographics, allergies (amber highlight), emergency contact, blood group.

Right pane — "New Consultation" form: Symptoms (textarea), Diagnosis (textarea), Notes (textarea), Vitals grid (BP, Heart Rate, Temperature, Weight, Height — small inputs with units), Follow-up date (date picker, optional). Action buttons: "Add Prescription" (opens sheet), "Order Lab Tests" (opens sheet). Primary "Complete Consultation" button (green).

Show the "Add Prescription" sheet overlay: list of prescription items, each row = medicine (searchable select), dosage, frequency (select: OD/BD/TDS/QID), duration (e.g. 5 days), instructions, quantity to dispense. "Add item" + "Save Prescription" buttons.

Show desktop two-pane, the prescription sheet, and mobile stacked.
```

## 8. Patient Dashboard — #10

```
Patient dashboard. Greeting banner: "Welcome back, [Name]" + a prominent "Book Appointment" primary CTA (stethoscope icon, blue-600).
Top row: Next Appointment card (or "No upcoming" empty state) | Active Prescriptions count | Pending Lab Results count.
Main: Recent Activity timeline — last 5 items (appointments, prescriptions, lab results) reverse-chronological, type icons + dates, each expandable.
Quick Actions row: Book Appointment, View Prescriptions, View Lab Results, Chat with AI (icon buttons/cards).
Show desktop (grid) and mobile (stacked).
```

## 9. Book Appointment Wizard — Patient — #5

```
"Book Appointment" 4-step wizard for a patient. Progress indicator at top: 1 Department → 2 Doctor → 3 Date & Slot → 4 Confirm.

Step 1 — Choose Department: grid of department cards (icon, name, short description, consultation fee ₹). Selectable (click highlights with blue-600 ring). "Next".
Step 2 — Choose Doctor: list of doctors in the selected department — avatar/initials, name, specialization, "Next available: <date>". Selectable. "Back" / "Next".
Step 3 — Date & Slot: date picker (next 14 days, blocked dates greyed) + grid of available time slots for the selected date (09:00, 09:15, 09:30…). Available slots clickable (blue-600 when selected); unavailable disabled + slate. "Back" / "Next".
Step 4 — Confirm: summary card — Department, Doctor, Date, Time, consultation fee ₹. "Confirm Booking" primary button. Success state: checkmark, appointment details, "Add to calendar" / "Done" buttons.

Show each step as a separate screen, plus the success state. Desktop and mobile.
```

## 10. Patient Timeline View — #13

```
Patient Timeline view. Header: patient name + MRN + age/gender. Filter bar: chips by type — All, Consultations, Prescriptions, Lab Results, Appointments. Optional date-range filter.

Timeline: vertical reverse-chronological list. Each entry is a slate-900 card with a left type-icon and colored left border per type (consultations blue, prescriptions teal, lab results indigo, appointments slate). Card shows: type label, date (DD MMM YYYY), one-line summary, expandable (chevron):
- Consultation: symptoms, diagnosis, notes, vitals, doctor name.
- Prescription: medicines with dosage/frequency/duration, "Download PDF".
- Lab Result: parameter table (parameter, value, unit, reference range), notes, attached file link.
- Appointment: doctor, department, time, status badge.

Show the collapsed list and one expanded consultation card. Desktop and mobile.
```

## 11. Receptionist Dashboard — #10

```
Receptionist dashboard. Top stats row — 4 cards: Today's Total Appointments, Checked In, Waiting, Completed.
Main: Today's Appointments table — time, patient name, MRN, doctor, status badge. A CONFIRMED row has a "Check In" button; a COMPLETED row has a "Generate Invoice" button.
Side panel: Walk-in Registration shortcut (compact form: First name*, Last name*, Phone* +91, "Register" button, "Full form" link) | Doctor Availability Overview (doctors on duty today, department, mini slot strip showing free/busy for the rest of the day).
Bottom: Recent Invoices (last 5: invoice #, patient, amount ₹, status badge DRAFT/ISSUED/PAID).
Show desktop (main + side panel) and mobile (stacked).
```

## 12. Invoice Screen — Receptionist — #11

```
Invoice screen for a Receptionist. Header: "Invoice INV-000123" + status badge (DRAFT slate, ISSUED blue, PAID green, CANCELLED red). Patient name + MRN + appointment reference.

Line items table — columns: Description, Qty, Rate (₹), Amount (₹). Example rows: Consultation fee — General Medicine (1 × ₹500); Lab Test: Complete Blood Count (1 × ₹300, internal only); Medicine: Paracetamol 500mg (10 × ₹2.50). Subtotal, adjustment if any, then "Total ₹XXX" highlighted.

Right panel / bottom: Payment method picker — Cash, UPI, Card, Bank Transfer (radio cards with icons). Action buttons by state:
- DRAFT: "Issue Invoice" (primary, blue-600) + "Cancel".
- ISSUED: "Mark Paid" (primary, opens confirm dialog with selected payment method) + "Download PDF".
- PAID: "Download PDF" + "Print".
A live PDF preview thumbnail with hospital letterhead.

Show DRAFT and PAID states. Desktop and mobile.
```

## 13. Lab Technician Dashboard + Result Entry — #7 / #10

```
Lab Technician dashboard. Top stats row — 3 cards: Pending Tests, In Progress, Completed Today.
Main: Test Queue table — patient name, MRN, test type, priority badge (Normal slate, Urgent red), ordered by/at, action button ("Collect Sample" for ORDERED, "Enter Results" for PROCESSING). Priority sorting: Urgent pinned to top, then FIFO.

Show the "Result Entry" screen (opens from a PROCESSING order): header (patient name, MRN, test type, priority), structured results table (columns Parameter, Value, Unit, Reference Range; editable rows; "Add row"; example CBC rows: Hemoglobin, RBC Count, WBC Count, Platelet Count), Notes textarea, file upload dropzone (PDF/images), "Submit Result" primary button (moves to COMPLETED) + "Save Draft".

Show the Test Queue and the Result Entry screen. Desktop and mobile.
```

## 14. Pharmacy / Inventory — Admin — #8

```
Pharmacy Inventory section for Admin. Top: low-stock alerts banner (amber) — "N medicines below reorder level" + "View all" link.

Medicines list — searchable, filter by category and active/inactive. Table columns: Name, Generic, Manufacturer, Category, Unit Price (₹), Total Stock (non-expired), Reorder Level, Status (In Stock green / Low Stock amber / Out of Stock red), Actions. Row click → Medicine detail.

Medicine detail: header (name + generic + "Edit" + "Deactivate"), stats row (Total non-expired stock, Total value ₹, Batches count, Reorder level), Batches table (Batch No., Expiry Date, Qty, Status Fresh green / Near Expiry amber / Expired red, FEFO order indicator, "Adjust Qty" action), "Add Batch" button → dialog (Batch No., Expiry Date, Qty received, Supplier optional).

Stock Adjustment dialog: current qty shown, new qty input, reason select (Damage, Recount, Other), notes field, "Adjust" button. Audit note: "Adjustments are logged."

Show the medicines list and the medicine detail with batches. Desktop and mobile.
```

## 15. AI Chatbot Panel — #14

```
AI chatbot panel (Gemini-powered), role-aware. Floating button (sparkle icon) anchored bottom-right of any authenticated screen; opens a ~380px wide panel on desktop, full-screen sheet on mobile.

Panel: header "AI Health Assistant" + role badge (e.g. "Doctor mode") + collapse/close. Suggested prompt chips (role-specific) above input — Doctor: "Show today's appointments", "Summarize last visit for MRN-00005", "Order CBC for current patient"; Patient: "Book a cardiology appointment", "Show my last prescription", "When is my next appointment?". Message list: user right-aligned (blue-600 bubbles), assistant left-aligned (slate-900 bubbles, slate-800 border), Markdown rendering for lists/tables.

For a proposed WRITE action (e.g. "Book appointment with Dr. X on Tue 10:00"), show an inline confirmation card: action summary + "Confirm" / "Cancel" buttons before executing. For complex actions, assistant messages include an "Open in app →" deep-link chip that navigates to the relevant screen.

Input bar: text input, attach button, send button. Disclaimer line: "AI can perform actions on your behalf based on your role."

Show the closed floating-button state, the open panel with a conversation including a write-action confirmation card, and a deep-link chip. Desktop and mobile.
```

## 16. Shared Patient Profile View — #10 / #13

```
Shared Patient Profile view (used by Doctor, Receptionist, Admin with role-appropriate edit permissions). Header card: avatar/initials, full name, MRN (e.g. MRN-00001), age/gender, blood group, phone, email, amber "Allergies" chip row, emergency contact mini-block, "Edit" button (top-right) → opens an edit form sheet.

Tabs: Timeline, Appointments, Prescriptions, Lab Results, Invoices.
- Timeline: reverse-chronological mixed list (consultations, prescriptions, lab results, appointments) with type icons + colored left borders, each expandable. Filter chips by type.
- Appointments: table (date, time, doctor, department, status badge).
- Prescriptions: list (date, doctor, items), expandable to medicines, "Download PDF" each.
- Lab Results: list (date, test type, status badge), expandable to parameter table + attached files.
- Invoices: table (invoice #, date, amount ₹, status badge), "Download PDF" each.

Show the Timeline tab open with one expanded consultation, and the Edit sheet overlay. Desktop and mobile.
```

---

## Status badge colors (shared across screens)

| State             | Color  |
| ----------------- | ------ |
| CONFIRMED         | blue   |
| CHECKED_IN        | amber  |
| IN_CONSULTATION   | indigo |
| COMPLETED         | green  |
| CANCELLED         | slate  |
| NO_SHOW           | red    |
| DRAFT             | slate  |
| ISSUED            | blue   |
| PAID              | green  |
| Normal (priority) | slate  |
| Urgent (priority) | red    |
