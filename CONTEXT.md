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
A person receiving medical care. Exists independently of a User account — a Receptionist can create a Patient record for a walk-in without credentials. A User with role PATIENT links to exactly one Patient record. Holds demographics, medical history, allergies, emergency contact. Identified by phone number (linking key for self-registration) and a system-generated MRN.
_Avoid_: Client, case

**MRN (Medical Record Number)**:
A unique, system-generated identifier for every Patient. Used for internal reference across the hospital. Not the database ID — a human-readable code (e.g., MRN-00001).
_Avoid_: Patient ID (ambiguous with database ID), case number

**DoctorProfile**:
Role-specific data for a User with role DOCTOR: specialization, license number, department assignment.
_Avoid_: Doctor (when referring to the profile data, not the person)

**Department**:
An organizational unit of the hospital (e.g., Cardiology, Orthopedics, General Medicine). Managed by Admin. Doctors are assigned to a Department (one Department per Doctor for MVP). Patients search by Department when booking. Carries a default consultation fee used for invoice generation.
_Avoid_: Specialty, ward, unit

### Scheduling

**Appointment**:
A reserved time slot linking a Patient to a Doctor on a specific date and time. Represents the scheduling act, not the clinical encounter. Auto-confirmed on booking (no approval step). States: CONFIRMED → CHECKED_IN → IN_CONSULTATION → COMPLETED. May also reach CANCELLED (before check-in) or NO_SHOW.
_Avoid_: Booking, visit, slot (when referring to the booked entity)

**Schedule**:
A Doctor's availability pattern defined by Admin, consisting of time blocks (e.g., Monday 9:00–13:00) with a fixed slot duration (e.g., 15 minutes). The system generates available Slots from the Schedule. Includes a blocked-dates list for leaves and holidays — slot generation skips blocked dates.
_Avoid_: Timetable, roster, calendar

**Slot**:
A single bookable time window generated from a Doctor's Schedule. Fixed duration. A Slot is either available or occupied by an Appointment.
_Avoid_: Time slot (use just "Slot"), window

### Clinical

**Consultation**:
The clinical record created when a Doctor sees a Patient during an Appointment. Contains symptoms, diagnosis, notes, and structured vitals (blood pressure, heart rate, temperature, weight, SpO2, blood sugar). An Appointment has zero or one Consultation.
_Avoid_: Visit, encounter, session

**Prescription**:
A medication order created during a Consultation. Standalone entity linked to a Consultation, containing one or more Prescription Items. Can be viewed, printed, and tracked independently.
_Avoid_: Script, Rx, medication order

**Prescription Item**:
A single line on a Prescription: one Medicine with dosage, frequency, duration, instructions, and quantity to dispense. Tracks dispensing status (dispensed or not).
_Avoid_: Prescription line, medicine entry

### Lab

**Lab Test Order**:
A request for a laboratory test, created by a Doctor (during or outside a Consultation). Specifies the test type, patient, priority, and instructions. States: ORDERED → SAMPLE_COLLECTED → PROCESSING → COMPLETED. May also reach CANCELLED (before sample collection).
_Avoid_: Test request, lab request

**Lab Result**:
The outcome of a completed Lab Test Order, recorded by a Lab Technician. May include structured data fields and/or uploaded files. Visible to the ordering Doctor, the Patient, any Doctor who later consults the Patient, and Admin.
_Avoid_: Test result, report

**Test Type**:
A master-data entry defining a kind of laboratory test (e.g., Complete Blood Count, Lipid Panel). Managed by Admin.
_Avoid_: Test template, test definition

### Pharmacy

**Medicine**:
A master-data entry for a type of medicine (e.g., Paracetamol 500mg). Holds name, generic name, manufacturer, category, unit price.
_Avoid_: Drug, medication (when referring to the master data)

**Medicine Batch**:
A specific batch of a Medicine with batch number, expiry date, and quantity in stock. Dispensing follows FEFO (First Expiry, First Out).
_Avoid_: Stock entry, inventory item

### Billing

**Invoice**:
A request for payment issued to a Patient after services are rendered. Auto-generated as DRAFT when a Consultation completes, pulling in consultation fee, lab test charges, and dispensed medicines. States: DRAFT → ISSUED → PAID. May also reach CANCELLED. Receptionist reviews, adjusts, issues, and records payment.
_Avoid_: Bill, receipt (a receipt is proof of payment, not the request)

**Invoice Item**:
A single line on an Invoice: a consultation fee, a lab test charge, or a dispensed medicine with quantity and price.
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
