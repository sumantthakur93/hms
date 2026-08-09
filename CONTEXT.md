# Hospital Management System

A hospital management system for Indian hospitals/clinics, supporting appointment booking, consultations, prescriptions with pharmacy inventory, lab test tracking, patient history, basic billing, and an AI chatbot.

## Language

### People & Access

**User**:
A person with login credentials (email, password) and a role. Handles authentication only — clinical and demographic data lives on the linked profile or Patient record.
_Avoid_: Account, member

**Role**:
One of five access levels assigned to a User: ADMIN, DOCTOR, PATIENT, RECEPTIONIST, LAB_TECHNICIAN. Exactly one role per User.
_Avoid_: Permission level, user type

**Patient**:
A person receiving medical care. Exists independently of a User account. Two registration paths: (A) Receptionist creates record for walk-in (name, phone required, demographics optional), (B) self-registration via Sign Up with phone-based linking to existing records. Holds: first name, last name, phone (required), email, date of birth, gender, blood group, address, emergency contact (name, phone, relationship), allergies (free text), medical history notes (free text). Editable by Patient (own, except MRN), Receptionist, and Admin. Searchable by name, phone, or MRN. Duplicate phone warning on creation (warn but allow — family members may share a phone).
_Avoid_: Client, case

**MRN (Medical Record Number)**:
A unique, system-generated, immutable identifier for every Patient. Used for internal reference across the hospital. Not the database ID — a human-readable code (e.g., MRN-00001). Never editable after creation.
_Avoid_: Patient ID (ambiguous with database ID), case number

**Patient Timeline**:
A reverse-chronological view of a Patient's medical history: Consultations, Prescriptions, Lab Results, and Appointments. Each entry is expandable. Filterable by type. Shown as tabbed panels during Consultation (see Consultation). Provides the Doctor with a complete clinical picture.
_Avoid_: Medical history (ambiguous with the free-text field), patient record

**DoctorProfile**:
Role-specific data for a User with role DOCTOR: specialization, license number, department assignment.
_Avoid_: Doctor (when referring to the profile data, not the person)

**Department**:
An organizational unit of the hospital (e.g., Cardiology, Orthopedics, General Medicine). Managed by Admin. Doctors are assigned to a Department (one Department per Doctor for MVP). Patients search by Department when booking. Carries a default consultation fee used for invoice generation.
_Avoid_: Specialty, ward, unit

### Scheduling

**Appointment**:
A reserved time slot linking a Patient to a Doctor on a specific date and time. Represents the scheduling act, not the clinical encounter. Auto-confirmed on booking (no approval step). States: CONFIRMED → CHECKED_IN → IN_CONSULTATION → COMPLETED. May also reach CANCELLED (before check-in) or NO_SHOW. Can be rescheduled while CONFIRMED (updates date/time, records original time for audit). Double-booking prevented by unique constraint on (doctorId, date, startTime).
_Avoid_: Booking, visit, slot (when referring to the booked entity)

**Reschedule**:
Changing an Appointment's date and/or time to a different available Slot. The Appointment keeps its identity — no cancel-and-rebook. Only allowed while status is CONFIRMED (before check-in). Records the original date/time for audit trail. Frees the old Slot and occupies the new one. Can be performed by Patient (own), Receptionist (any), or Admin.
_Avoid_: Move, shift

**Schedule**:
A Doctor's availability pattern defined by Admin, consisting of one or more Schedule Blocks per day-of-week. The system computes available Slots on-the-fly from the Schedule — no Slot table in the database.
_Avoid_: Timetable, roster, calendar

**Schedule Block**:
A single time range within a Doctor's Schedule for a specific day of the week: dayOfWeek, startTime, endTime, slotDuration (in minutes). Multiple blocks per day are allowed (e.g., morning 09:00–13:00 + afternoon 14:00–17:00). Admin creates and manages these.
_Avoid_: Time block, availability block

**Blocked Date**:
A specific date on which a Doctor is unavailable (leave, holiday, emergency). Managed by Admin. Slot generation returns empty for blocked dates. Stores doctorId, date, and optional reason.
_Avoid_: Leave, off-day, holiday (use Blocked Date as the system term)

**Slot**:
A single bookable time window computed on-the-fly from a Doctor's Schedule Blocks. Not stored in the database. Fixed duration determined by the Schedule Block's slotDuration. A Slot is either available (no Appointment exists at that time) or occupied.
_Avoid_: Time slot (use just "Slot"), window

### Clinical

**Consultation**:
The clinical record created when a Doctor sees a Patient during a CHECKED_IN Appointment. Contains symptoms, diagnosis, notes, structured vitals, and an optional follow-up date. An Appointment has zero or one Consultation (zero for cancellation/no-show). One Prescription and zero or more Lab Test Orders may be created within a Consultation. Editable for 24 hours after completion, then locked. The Doctor views the Patient's history as tabbed panels (Past Consultations, Prescriptions, Lab Results, Patient Info) alongside the Consultation form. All fields are optional — the only required action is completing.
_Avoid_: Visit, encounter, session

**Prescription**:
A medication order created during a Consultation. One Prescription per Consultation, containing one or more Prescription Items. Can be viewed, printed as PDF (with hospital letterhead), and tracked independently. Editable within the 24-hour Consultation edit window, only if items have not been dispensed.
_Avoid_: Script, Rx, medication order

**Prescription Item**:
A single line on a Prescription: one Medicine with dosage, frequency, duration, instructions, and quantity to dispense. Tracks dispensing status (dispensed or not).
_Avoid_: Prescription line, medicine entry

### Lab

**Lab Test Order**:
A recommendation for a laboratory test, created by a Doctor during or outside a Consultation. Specifies the test type, patient, priority (Normal/Urgent), and instructions. Initially all orders are recommendations. The Receptionist sets the isInternal flag based on whether the patient wants the test done at this hospital. When isInternal is true, the order flows to the hospital's Lab Technician queue and progresses through states (ORDERED → SAMPLE_COLLECTED → PROCESSING → COMPLETED, or CANCELLED before sample collection). When false, it is an external recommendation — recorded for the Patient's medical history but not tracked through internal lab states.
_Avoid_: Test request, lab request

**Lab Result**:
The outcome of a Lab Test Order. For internal orders, recorded by a Lab Technician with structured data (JSON array of parameter/value/unit/referenceRange), optional notes, and optional file uploads. For external orders, a file (PDF/image) uploaded by the Patient, Doctor, or Receptionist. Visible to the ordering Doctor, the Patient, any Doctor who later consults the Patient, and Admin.
_Avoid_: Test result, report

**Test Type**:
A master-data entry defining a kind of laboratory test (e.g., Complete Blood Count, Lipid Panel). Holds name, short code, category (Hematology, Biochemistry, etc.), price, optional description, and an active flag for soft deletion. Managed by Admin. Doctors search from active Test Types when ordering.
_Avoid_: Test template, test definition

### Pharmacy

**Medicine**:
A master-data entry for a type of medicine (e.g., Paracetamol 500mg). Holds name, generic name, manufacturer, category, unit price, reorder level (low-stock threshold), and active flag for soft deletion. Managed by Admin.
_Avoid_: Drug, medication (when referring to the master data)

**Medicine Batch**:
A specific batch of a Medicine with batch number, expiry date, and quantity in stock. Created by Admin when new stock is received. Expired batches (expiryDate <= today) are automatically excluded from dispensing and stock counts but retained for audit. Dispensing follows FEFO (First Expiry, First Out) with automatic batch selection — may split across multiple batches if needed. Admin can adjust quantity with a logged reason (damage, recount).
_Avoid_: Stock entry, inventory item

**Low Stock Alert**:
A visual indicator on the Admin dashboard when a Medicine's total non-expired stock across all batches drops to or below its reorder level. No email/SMS or auto-ordering — informational only.
_Avoid_: Reorder alert, stock warning

### Billing

**Invoice**:
A request for payment created by the Receptionist after post-consultation processing is complete (dispensing, internal lab test selection). NOT auto-generated — the Receptionist initiates it by clicking "Generate Invoice." Created as DRAFT with line items: consultation fee (from Department), internal lab test charges (Test Type price), and dispensed medicine charges (quantity x unit price). External lab tests are never billed. States: DRAFT → ISSUED → PAID. May also reach CANCELLED. No partial payments — full amount or adjusted with a discount line. Sequential invoice number (INV-{year}-{5-digit sequence}). Printable as PDF with hospital letterhead. Payment recorded with method (Cash, UPI, Card, Bank Transfer) and optional transaction reference.
_Avoid_: Bill, receipt (a receipt is proof of payment, not the request)

**Invoice Item**:
A single line on an Invoice: a consultation fee, an internal lab test charge, a dispensed medicine charge, or a discount (negative amount with reason). Only discounts can be added while DRAFT.
_Avoid_: Line item, charge

**Dispensing**:
The act of issuing medicines from pharmacy inventory against a Prescription. Performed by the Receptionist. Each Prescription Item is dispensed separately, decrementing Medicine Batch stock via FEFO. Creates an audit trail and links to billing.
_Avoid_: Filling (US pharmacy term), issuing

### Access Control

**Route Guard**:
Middleware-level check that verifies a User's Role against the route prefix before the page loads. Each role has its own route prefix (/admin/*, /doctor/*, /patient/*, /receptionist/*, /lab/*). Prevents unauthorized users from seeing pages they shouldn't access. UX layer only — not the security boundary.
_Avoid_: Route protection, page guard

**Server Action Guard**:
Data-level check inside every server action that verifies both Role and ownership before executing a database operation. The real security boundary — enforces that a Doctor can only query their own patients, a Patient can only see their own records. Implemented as inline WHERE clauses in Prisma queries, not hidden middleware.
_Avoid_: API guard, data guard

**Ownership**:
The rule that a user can only access resources they are linked to. A Doctor owns Consultations they created and Patients they have Appointments with. A Patient owns their own records. Enforced by including the user's profileId or patientId in every query's WHERE clause.
_Avoid_: Data scoping, row-level access
