# Manual Test Plan — T1 through T6

Coverage for closed tickets **#19–#24** of the HMS build. Each section maps
acceptance criteria to executable manual test cases. Test IDs follow the
convention `T<ticket>-<group>.<n>` (e.g. `T1-INF.01`).

> **Tester note:** Run `pnpm db:seed` before each full pass so the seed data
> referenced below exists. Dates marked _today_ are relative to the run date —
> the seed script stamps the three sample appointments on the current calendar
> day, so "today's appointments" tests always have data.

---

## 0. Test Environment & Reference Data

### 0.1 Prerequisites

- Dev server running: `pnpm dev` (Turbopack) on `http://localhost:3000`
- Database seeded: `pnpm db:seed` succeeds against Supabase
- Browser with devtools open (Network + Console tabs)
- A second browser profile / incognito window for cross-role checks
- Mobile viewport emulation (e.g. 390×844 iPhone 14) for responsive tests

### 0.2 Seed Credentials

| Role           | Email                      | Password     |
| -------------- | -------------------------- | ------------ |
| Admin          | admin@carepoint.in         | admin123     |
| Receptionist   | receptionist@carepoint.in  | reception123 |
| Lab Technician | lab@carepoint.in           | lab123       |
| Doctor         | rajesh.mehta@carepoint.in  | doctor123    |
| Doctor         | anjali.sharma@carepoint.in | doctor123    |
| Doctor         | vikram.singh@carepoint.in  | doctor123    |
| Doctor         | meera.iyer@carepoint.in    | doctor123    |
| Patient        | rahul.kumar@gmail.com      | patient123   |
| Patient        | sneha.patel@gmail.com      | patient123   |
| Patient        | arjun.nair@gmail.com       | patient123   |

Walk-in patients (no login): **Lakshmi Reddy** (MRN-00004), **Mohammed Khan** (MRN-00005).

### 0.3 Seed Data Snapshot

- **8 departments:** General Medicine (₹500), Cardiology (₹1000), Orthopedics (₹800), Pediatrics (₹600), Dermatology (₹700), ENT (₹600), Ophthalmology (₹700), Gynecology (₹800)
- **4 doctors** — one each in Cardiology, General Medicine, Orthopedics, Pediatrics
- **Schedule blocks** — every doctor, Mon–Fri (days 1–5), 09:00–13:00, 30-min slots
- **5 patients** — 3 with User accounts (MRN-00001…00003), 2 walk-in (00004, 00005)
- **3 appointments, all dated _today_:**
  - appt1 — Rahul Kumar + Dr. Rajesh Mehta (Cardiology), 10:00–10:30, **CONFIRMED**
  - appt2 — Sneha Patel + Dr. Anjali Sharma (General Medicine), 09:30–10:00, **CHECKED_IN**
  - appt3 — Arjun Nair + Dr. Vikram Singh (Orthopedics), 09:00–09:30, **COMPLETED**
- **1 consultation** with a prescription (linked to appt3 / Arjun Nair)

### 0.4 Role → Dashboard Routes

| Role           | Route           |
| -------------- | --------------- |
| ADMIN          | `/admin`        |
| DOCTOR         | `/doctor`       |
| PATIENT        | `/patient`      |
| RECEPTIONIST   | `/receptionist` |
| LAB_TECHNICIAN | `/lab`          |

---

## T1 — Prefactor: test infra + mobile nav + rich seed (#19)

### T1-INF — Test infrastructure

| ID        | Scenario                              | Priority | Steps                          | Expected                                                                             |
| --------- | ------------------------------------- | -------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| T1-INF.01 | Test suite runs                       | High     | `pnpm test`                    | Vitest exits 0; example server-action test + example server-component test both pass |
| T1-INF.02 | Test DB resets between runs           | High     | Run `pnpm test` twice in a row | Second run passes; no state leakage / duplicate-key errors                           |
| T1-INF.03 | Mocked auth helpers cover all 5 roles | Medium   | Inspect test helpers           | Helpers exist for ADMIN, DOCTOR, PATIENT, RECEPTIONIST, LAB_TECHNICIAN sessions      |

### T1-SEED — Rich seed script

| ID         | Scenario                                        | Priority | Steps                     | Expected                                                                                     |
| ---------- | ----------------------------------------------- | -------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| T1-SEED.01 | Seed runs cleanly                               | High     | `pnpm db:seed`            | Exits 0; console logs 4 doctors, 5 patients, schedule blocks, 3 appointments, 1 consultation |
| T1-SEED.02 | Seed is idempotent                              | High     | Run `pnpm db:seed` twice  | Second run exits 0 (upserts); no duplicate rows, MRNs stable                                 |
| T1-SEED.03 | Seed creates 4 doctors in correct depts         | Medium   | `pnpm db:studio` or query | Cardiology, General Medicine, Orthopedics, Pediatrics each have exactly 1 doctor             |
| T1-SEED.04 | Seed creates 5 patients (3 w/ accounts)         | Medium   | Query patients            | MRN-00001…00005; 00001–00003 have linked `userId`, 00004–00005 have `userId = null`          |
| T1-SEED.05 | Seed creates schedule blocks                    | Medium   | Query scheduleBlock       | 20 blocks (4 doctors × 5 days), 09:00–13:00, 30-min                                          |
| T1-SEED.06 | Seed creates 3 appointments w/ correct statuses | Medium   | Query appointment         | 1 CONFIRMED, 1 CHECKED_IN, 1 COMPLETED, all dated today                                      |
| T1-SEED.07 | Seed creates 1 consultation + prescription      | Medium   | Query consultation        | Exactly 1 consultation with ≥1 prescription row                                              |

### T1-NAV — Mobile navigation & header

| ID        | Scenario                       | Priority | Steps                                         | Expected                                                        |
| --------- | ------------------------------ | -------- | --------------------------------------------- | --------------------------------------------------------------- |
| T1-NAV.01 | Desktop sidebar visible on lg+ | High     | Login as admin, viewport ≥1024px              | Left sidebar renders with role nav items                        |
| T1-NAV.02 | Sidebar hidden on mobile       | High     | Shrink to <1024px                             | Sidebar disappears; no horizontal scroll                        |
| T1-NAV.03 | Mobile bottom tab bar appears  | High     | Mobile viewport, any role                     | Bottom tab bar visible with top 4–5 nav items + "More" overflow |
| T1-NAV.04 | "More" overflow sheet opens    | Medium   | Tap "More" on mobile                          | Sheet/drawer opens listing remaining nav items                  |
| T1-NAV.05 | Bottom tab navigates           | High     | Tap a tab on mobile                           | Route changes; active tab highlighted                           |
| T1-NAV.06 | Header shows avatar            | High     | Any dashboard                                 | User avatar (image or initials) visible in header               |
| T1-NAV.07 | Header shows name + role badge | High     | Any dashboard                                 | User name + role label (e.g. "Admin") visible in header         |
| T1-NAV.08 | Header logout dropdown works   | High     | Click avatar/name in header                   | Dropdown opens with Logout option                               |
| T1-NAV.09 | All existing pages render      | High     | Visit /, /login, /signup, each role dashboard | No console errors; pages render content                         |
| T1-NAV.10 | Nav items match role           | Medium   | Compare each role's nav to `NAV_PER_ROLE`     | Items + hrefs match config                                      |

---

## T2 — Auth: login + patient signup (#20)

### T2-LOGIN — Login flow

| ID          | Scenario                                  | Priority | Steps                                                    | Expected                                                                                                         |
| ----------- | ----------------------------------------- | -------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| T2-LOGIN.01 | Login page renders                        | High     | Visit `/login` (logged out)                              | Centered card on slate-950; hospital logo + name; email, password, show/hide, "Forgot password?", Sign In button |
| T2-LOGIN.02 | Valid admin login                         | High     | admin@carepoint.in / admin123 → Sign In                  | Redirects to `/admin`; header shows Admin name + badge                                                           |
| T2-LOGIN.03 | Valid patient login redirects to /patient | High     | rahul.kumar@gmail.com / patient123                       | Redirects to `/patient`                                                                                          |
| T2-LOGIN.04 | Valid receptionist login                  | High     | receptionist@carepoint.in / reception123                 | Redirects to `/receptionist`                                                                                     |
| T2-LOGIN.05 | Valid doctor login                        | High     | rajesh.mehta@carepoint.in / doctor123                    | Redirects to `/doctor`                                                                                           |
| T2-LOGIN.06 | Valid lab login                           | Medium   | lab@carepoint.in / lab123                                | Redirects to `/lab`                                                                                              |
| T2-LOGIN.07 | Wrong password                            | High     | valid email + wrong password                             | Amber/red error message; stays on /login; no session created                                                     |
| T2-LOGIN.08 | Unregistered email                        | High     | nobody@nowhere.in / anything                             | Error message; stays on /login                                                                                   |
| T2-LOGIN.09 | Empty fields                              | Medium   | Submit with empty email/password                         | Validation error; no request sent                                                                                |
| T2-LOGIN.10 | Password show/hide toggle                 | Medium   | Click eye icon                                           | Password text reveals/hides                                                                                      |
| T2-LOGIN.11 | "Forgot password?" link present           | Low      | Click link                                               | Visual only for MVP — no crash (placeholder OK)                                                                  |
| T2-LOGIN.12 | Authenticated user hitting /login         | Medium   | Already logged in, visit /login                          | Redirects to role dashboard (landing redirect logic)                                                             |
| T2-LOGIN.13 | callbackUrl honored after login           | Medium   | Visit `/patient` while logged out, then login as patient | Lands on `/patient`, not generic dashboard                                                                       |

### T2-SIGNUP — Patient self-registration

| ID           | Scenario                                       | Priority | Steps                                                           | Expected                                                                                    |
| ------------ | ---------------------------------------------- | -------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| T2-SIGNUP.01 | Signup page renders (desktop)                  | High     | Visit `/signup` logged out                                      | Two-column layout: form left, illustration + value props right                              |
| T2-SIGNUP.02 | Signup page renders (mobile)                   | Medium   | Mobile viewport                                                 | Single column; illustration below or hidden                                                 |
| T2-SIGNUP.03 | Required-field validation                      | High     | Submit empty form                                               | Errors on first/last name, phone, email, password, confirm                                  |
| T2-SIGNUP.04 | Password mismatch                              | High     | Enter differing password + confirm                              | Error on confirm field                                                                      |
| T2-SIGNUP.05 | Password strength indicator                    | Medium   | Type a weak then strong password                                | Strength indicator updates (weak → strong)                                                  |
| T2-SIGNUP.06 | Phone +91 prefix shown                         | Medium   | Inspect phone field                                             | +91 prefix present                                                                          |
| T2-SIGNUP.07 | Optional section collapsible                   | Medium   | Toggle "More about you"                                         | Section expands/collapses; DOB, gender, blood group, address, emergency, allergies, history |
| T2-SIGNUP.08 | Successful signup creates User + Patient + MRN | High     | Register new patient (unique email+phone)                       | Success; MRN generated (MRN-XXXXX format); can login with new creds; lands on /patient      |
| T2-SIGNUP.09 | Optional fields persisted                      | Medium   | Fill optional fields, submit                                    | Query DB — DOB, gender, blood group, address, emergency, allergies, history saved           |
| T2-SIGNUP.10 | Duplicate email blocked                        | High     | Reuse an existing email (e.g. rahul.kumar@gmail.com)            | Error: account with this email already exists                                               |
| T2-SIGNUP.11 | Duplicate phone warning appears                | High     | Use a phone matching an existing patient (e.g. +91 98765 43210) | Amber banner under phone field with Continue/Cancel                                         |
| T2-SIGNUP.12 | "Continue anyway" on duplicate phone           | High     | See warning → Continue anyway → submit                          | Registration proceeds; second patient created with same phone                               |
| T2-SIGNUP.13 | "Cancel" on duplicate phone                    | Medium   | See warning → Cancel                                            | Form returns to editable state; no patient created                                          |
| T2-SIGNUP.14 | MRN increments correctly                       | Medium   | Signup after seed (last MRN-00005)                              | New MRN = MRN-00006                                                                         |
| T2-SIGNUP.15 | "Already have an account? Sign in" link        | Low      | Click link                                                      | Navigates to /login                                                                         |

### T2-LOGOUT — Logout

| ID           | Scenario                     | Priority | Steps                                      | Expected                                     |
| ------------ | ---------------------------- | -------- | ------------------------------------------ | -------------------------------------------- |
| T2-LOGOUT.01 | Logout from header dropdown  | High     | Login any role → header avatar → Logout    | Session destroyed; redirected to /login or / |
| T2-LOGOUT.02 | Protected route after logout | High     | After logout, visit /admin                 | Redirected to /login                         |
| T2-LOGOUT.03 | Logout persists across tabs  | Medium   | Logout in tab A, refresh tab B on /patient | Tab B redirected to /login                   |

---

## T3 — Patient registration (Receptionist) + search (#21)

### T3-REG — Walk-in registration

| ID        | Scenario                                    | Priority | Steps                                                                     | Expected                                                                       |
| --------- | ------------------------------------------- | -------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| T3-REG.01 | Registration form accessible                | High     | Login receptionist → dashboard side panel / dedicated page                | Compact form: first name, last name, phone (+91); optional collapsible section |
| T3-REG.02 | Required-field validation                   | High     | Submit empty                                                              | Errors on first/last name, phone                                               |
| T3-REG.03 | Successful walk-in creates Patient, no User | High     | Register "Test Walkin" / +91 90000 00001                                  | Success; MRN generated; DB: Patient row, `userId = null`                       |
| T3-REG.04 | MRN increments                              | Medium   | Register after seed                                                       | Next MRN = MRN-00006 (or +1 from current max)                                  |
| T3-REG.05 | Optional fields saved                       | Medium   | Expand section, fill DOB/gender/blood/address/emergency/allergies/history | All saved to patient row                                                       |
| T3-REG.06 | Duplicate phone warning                     | High     | Use +91 98765 43210 (Rahul)                                               | Amber banner; Continue anyway / Cancel                                         |
| T3-REG.07 | Continue anyway creates second patient      | High     | Warning → Continue → submit                                               | Second patient with same phone created                                         |
| T3-REG.08 | Success state offers actions                | Medium   | After successful registration                                             | Shows MRN + "Book Appointment" + "Register Another"                            |
| T3-REG.09 | "Register Another" resets form              | Low      | Click Register Another                                                    | Form cleared, ready for next patient                                           |
| T3-REG.10 | Admin can register walk-in                  | Medium   | Login admin, access registration                                          | Form works (ADMIN authorized)                                                  |
| T3-REG.11 | Patient cannot register walk-in             | High     | Login patient, attempt createPatient action                               | Unauthorized (route guard + action guard)                                      |

### T3-SEARCH — Patient search

| ID           | Scenario                      | Priority | Steps                                | Expected                                                |
| ------------ | ----------------------------- | -------- | ------------------------------------ | ------------------------------------------------------- |
| T3-SEARCH.01 | Search by name                | High     | Type "Rahul"                         | Results show Rahul Kumar, MRN-00001, phone, last visit  |
| T3-SEARCH.02 | Search by partial name        | High     | Type "ku"                            | Contains match returns Kumar (Rahul Kumar)              |
| T3-SEARCH.03 | Search by phone               | High     | Type "98765"                         | Returns Rahul Kumar                                     |
| T3-SEARCH.04 | Search by MRN                 | High     | Type "00001"                         | Returns Rahul Kumar                                     |
| T3-SEARCH.05 | Search case-insensitive       | Medium   | Type "rahul" (lowercase)             | Returns Rahul Kumar                                     |
| T3-SEARCH.06 | Min 2 chars required          | Medium   | Type 1 char                          | No results / no query fired                             |
| T3-SEARCH.07 | No match                      | Medium   | Type "zzzzz"                         | Empty results state (no crash)                          |
| T3-SEARCH.08 | Result click → patient detail | High     | Click a result                       | Patient profile/detail view opens                       |
| T3-SEARCH.09 | Results show last visit date  | Medium   | Inspect result row                   | Last visit date present (appointment date or createdAt) |
| T3-SEARCH.10 | Doctor can search             | Medium   | Login doctor, attempt searchPatients | Authorized (DOCTOR in allowed roles)                    |
| T3-SEARCH.11 | Patient cannot search         | High     | Login patient, attempt search        | Unauthorized                                            |

### T3-EDIT — Edit demographics

| ID         | Scenario                           | Priority | Steps                                         | Expected                                               |
| ---------- | ---------------------------------- | -------- | --------------------------------------------- | ------------------------------------------------------ |
| T3-EDIT.01 | Edit form opens with existing data | High     | Receptionist → search → select patient → Edit | Form pre-filled with current demographics              |
| T3-EDIT.02 | MRN read-only                      | High     | Inspect edit form                             | MRN field disabled / not editable                      |
| T3-EDIT.03 | Save changes                       | High     | Edit address → save                           | Success; DB updated; re-open shows new value           |
| T3-EDIT.04 | Phone not editable                 | Medium   | Inspect edit form                             | Phone field absent/disabled (updateSchema omits phone) |
| T3-EDIT.05 | Admin can edit                     | Medium   | Login admin → edit patient                    | Save succeeds                                          |
| T3-EDIT.06 | Doctor cannot edit                 | High     | Login doctor, attempt updatePatient           | Unauthorized (DOCTOR not in update roles)              |
| T3-EDIT.07 | Patient cannot edit others         | High     | Login patient, attempt updatePatient          | Unauthorized                                           |
| T3-EDIT.08 | Optional fields clearable          | Medium   | Clear allergies field → save                  | DB stores null                                         |

---

## T4 — Admin: doctor schedule management (#22)

### T4-DOCS — Doctor list

| ID         | Scenario                      | Priority | Steps                            | Expected                                                                  |
| ---------- | ----------------------------- | -------- | -------------------------------- | ------------------------------------------------------------------------- |
| T4-DOCS.01 | Admin dashboard lists doctors | High     | Login admin → /admin             | List of 4 doctors with name, specialization, department, schedule summary |
| T4-DOCS.02 | Select doctor shows schedule  | High     | Click a doctor                   | Their schedule blocks per day-of-week + blocked dates list                |
| T4-DOCS.03 | Non-admin redirected          | High     | Login patient → visit /admin     | Redirected to /patient (middleware)                                       |
| T4-DOCS.04 | getDoctors action admin-only  | Medium   | As receptionist, call getDoctors | Throws Unauthorized                                                       |

### T4-BLOCK — Schedule block CRUD

| ID          | Scenario                 | Priority | Steps                                                               | Expected                                              |
| ----------- | ------------------------ | -------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| T4-BLOCK.01 | Create schedule block    | High     | Select doctor → add block: day=2 (Tue), 14:00–17:00, 30 min         | Block created; appears in list                        |
| T4-BLOCK.02 | Multiple blocks per day  | High     | Add a second block same day (09:00–13:00 + 14:00–17:00)             | Both blocks listed                                    |
| T4-BLOCK.03 | Edit schedule block      | High     | Edit existing block → change end to 14:00                           | Updated in list                                       |
| T4-BLOCK.04 | Delete schedule block    | High     | Delete a block                                                      | Removed from list                                     |
| T4-BLOCK.05 | dayOfWeek validation 0–6 | Medium   | Submit day=7                                                        | Validation error                                      |
| T4-BLOCK.06 | slotDuration 5–120       | Medium   | Submit duration=3 or =200                                           | Validation error                                      |
| T4-BLOCK.07 | start < end enforced     | Medium   | Submit 13:00–09:00                                                  | Validation error "Start time must be before end time" |
| T4-BLOCK.08 | HH:mm format enforced    | Medium   | Submit "9:00"                                                       | Validation error                                      |
| T4-BLOCK.09 | Non-admin create blocked | High     | As receptionist, call createScheduleBlock                           | Throws Unauthorized                                   |
| T4-BLOCK.10 | Slots reflect new block  | High     | After adding Tue 14:00–17:00, as patient compute slots for next Tue | 14:00…16:30 slots appear                              |

### T4-BLOCKED — Blocked dates

| ID            | Scenario                           | Priority | Steps                                                        | Expected                                                                  |
| ------------- | ---------------------------------- | -------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| T4-BLOCKED.01 | Add blocked date                   | High     | Select doctor → calendar pick a future date → reason "Leave" | Blocked date listed with reason                                           |
| T4-BLOCKED.02 | Add blocked date w/o reason        | Medium   | Leave reason empty                                           | Blocked date created, reason null                                         |
| T4-BLOCKED.03 | Duplicate blocked date rejected    | High     | Block same doctor+date twice                                 | Error "already blocked"                                                   |
| T4-BLOCKED.04 | Remove blocked date                | High     | Delete a blocked date                                        | Removed from list; slots regenerate for that date                         |
| T4-BLOCKED.05 | Blocked date greys out in wizard   | High     | As patient, booking wizard date picker on blocked date       | Date disabled/greyed                                                      |
| T4-BLOCKED.06 | Blocked date returns no slots      | High     | computeSlots for blocked date                                | Empty slots array                                                         |
| T4-BLOCKED.07 | Non-admin blocked date ops         | High     | As doctor, call addBlockedDate                               | Throws Unauthorized                                                       |
| T4-BLOCKED.08 | Block today affects existing appt? | Medium   | Block today for a doctor with a CONFIRMED appt today         | Existing appt unaffected (block only stops new slot gen); verify no error |

---

## T5 — Appointment booking (Patient wizard) (#23)

### T5-WIZ — 4-step wizard navigation

| ID        | Scenario                            | Priority | Steps                             | Expected                                                                            |
| --------- | ----------------------------------- | -------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| T5-WIZ.01 | Wizard renders step 1               | High     | Login patient → /patient/book     | Department grid (icon, name, description, fee ₹); progress indicator at step 1      |
| T5-WIZ.02 | Department selectable               | High     | Click a department card           | Blue-600 ring; "Next" enabled                                                       |
| T5-WIZ.03 | Next → step 2 doctors               | High     | Select dept → Next                | Doctors in that dept listed (avatar/initials, name, specialization, next available) |
| T5-WIZ.04 | Back returns to step 1              | High     | Step 2 → Back                     | Returns to department grid; selection preserved                                     |
| T5-WIZ.05 | Select doctor → step 3              | High     | Select doctor → Next              | Date picker (next 14 days) + slot grid                                              |
| T5-WIZ.06 | Step 3 → step 4 confirm             | High     | Pick date + available slot → Next | Summary card: Department, Doctor, Date, Time, fee ₹                                 |
| T5-WIZ.07 | Progress indicator updates          | Medium   | Move through steps                | Indicator highlights current step                                                   |
| T5-WIZ.08 | Cannot Next without selection       | Medium   | Step 1, click Next w/o selecting  | Disabled or validation error                                                        |
| T5-WIZ.09 | Confirm Booking creates appointment | High     | Step 4 → Confirm Booking          | Success state: checkmark, appointment details, "Done"                               |
| T5-WIZ.10 | "Done" returns to dashboard         | Medium   | Click Done                        | Returns to /patient                                                                 |

### T5-SLOTS — Slot computation

| ID          | Scenario                       | Priority | Steps                                              | Expected                                                     |
| ----------- | ------------------------------ | -------- | -------------------------------------------------- | ------------------------------------------------------------ |
| T5-SLOTS.01 | Slots generated from schedule  | High     | Pick a weekday (Mon–Fri) for a doctor              | 09:00, 09:30, …, 12:30 slots (8 slots for 09:00–13:00/30min) |
| T5-SLOTS.02 | No slots on unscheduled day    | High     | Pick a Sunday (day 0)                              | Empty slot grid                                              |
| T5-SLOTS.03 | Blocked date → no slots        | High     | Pick a blocked date                                | Empty / "no slots" message                                   |
| T5-SLOTS.04 | Booked slot disabled           | High     | Pick today for Dr. Rajesh Mehta                    | 10:00 slot disabled (appt1 booked)                           |
| T5-SLOTS.05 | Available slot selectable      | High     | Pick an open slot                                  | Blue-600 when selected                                       |
| T5-SLOTS.06 | Date picker limited to 14 days | Medium   | Inspect date picker                                | Only next 14 days selectable; past dates disabled            |
| T5-SLOTS.07 | Multiple blocks combine        | Medium   | Doctor with 2 blocks same day                      | Slots from both blocks shown in order                        |
| T5-SLOTS.08 | Cancelled appt frees slot      | High     | Cancel an appt, recompute slots for that date/time | Slot now available                                           |

### T5-BOOK — Booking & double-booking

| ID         | Scenario                             | Priority | Steps                                                      | Expected                            |
| ---------- | ------------------------------------ | -------- | ---------------------------------------------------------- | ----------------------------------- |
| T5-BOOK.01 | Booking creates CONFIRMED appt       | High     | Complete wizard for open slot                              | DB: Appointment status CONFIRMED    |
| T5-BOOK.02 | Double-booking prevented             | High     | Book same doctor+date+time twice (two sessions/concurrent) | Second fails: "slot already booked" |
| T5-BOOK.03 | Booked slot disappears from wizard   | High     | After booking, reload wizard for same date                 | That slot now disabled              |
| T5-BOOK.04 | Reason optional                      | Medium   | Complete wizard w/o reason                                 | Appointment created, reason null    |
| T5-BOOK.05 | Patient w/o profile blocked          | Medium   | Patient user with no patientId, attempt book               | Error "No patient profile found"    |
| T5-BOOK.06 | Non-patient/non-receptionist blocked | High     | Login doctor, call bookAppointment                         | Unauthorized                        |

### T5-RESCHED — Reschedule

| ID            | Scenario                          | Priority | Steps                                                                    | Expected                                                 |
| ------------- | --------------------------------- | -------- | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| T5-RESCHED.01 | Reschedule CONFIRMED appt         | High     | Patient → my appointments → reschedule a CONFIRMED appt to new date/slot | New appt CONFIRMED; originalDate + originalTime recorded |
| T5-RESCHED.02 | Reschedule records original       | Medium   | After reschedule, inspect DB                                             | originalDate = old date, originalTime = old start        |
| T5-RESCHED.03 | Old slot freed                    | High     | After reschedule, compute slots for old date/time                        | Old slot available again                                 |
| T5-RESCHED.04 | Cannot reschedule non-CONFIRMED   | High     | Attempt reschedule on CHECKED_IN/COMPLETED/CANCELLED                     | Error "Only confirmed appointments can be rescheduled"   |
| T5-RESCHED.05 | Cannot reschedule to blocked date | High     | Reschedule to a blocked date                                             | Error "date is blocked"                                  |
| T5-RESCHED.06 | Cannot reschedule to booked slot  | High     | Reschedule to an already-booked slot                                     | Error "new slot already booked"; original appt restored  |
| T5-RESCHED.07 | Patient can't reschedule others   | High     | Patient attempts reschedule on another patient's appt                    | Unauthorized                                             |
| T5-RESCHED.08 | Receptionist can reschedule       | Medium   | Receptionist reschedules a patient's appt                                | Succeeds                                                 |

### T5-CANCEL — Cancel

| ID           | Scenario                        | Priority | Steps                                 | Expected                                                                 |
| ------------ | ------------------------------- | -------- | ------------------------------------- | ------------------------------------------------------------------------ |
| T5-CANCEL.01 | Cancel CONFIRMED appt           | High     | Patient → cancel a CONFIRMED appt     | Status CANCELLED; cancelledAt set                                        |
| T5-CANCEL.02 | Cancelled slot freed            | High     | After cancel, compute slots           | Slot available again                                                     |
| T5-CANCEL.03 | Cannot cancel non-CONFIRMED     | High     | Cancel a CHECKED_IN appt              | Error "Only confirmed appointments can be cancelled"                     |
| T5-CANCEL.04 | Cancelled appt hidden from list | Medium   | Patient "my appointments"             | CANCELLED appts excluded (getMyAppointments filters status != CANCELLED) |
| T5-CANCEL.05 | Patient can't cancel others     | High     | Cancel another patient's appt         | Unauthorized                                                             |
| T5-CANCEL.06 | Receptionist can cancel         | Medium   | Receptionist cancels a patient's appt | Succeeds                                                                 |

### T5-MYAPPT — My appointments view

| ID           | Scenario                          | Priority | Steps                               | Expected                                            |
| ------------ | --------------------------------- | -------- | ----------------------------------- | --------------------------------------------------- |
| T5-MYAPPT.01 | Lists upcoming appointments       | High     | Login Rahul → /patient/appointments | Shows his CONFIRMED appt (today, Cardiology, 10:00) |
| T5-MYAPPT.02 | Shows doctor + department + fee   | Medium   | Inspect row                         | Doctor name, department, consultationFee visible    |
| T5-MYAPPT.03 | Reschedule/cancel actions present | Medium   | Inspect CONFIRMED row               | Reschedule + Cancel buttons                         |
| T5-MYAPPT.04 | Ordered by date asc               | Low      | Multiple appts                      | Ascending date order                                |

---

## T6 — Receptionist: appointment management (#24)

### T6-TODAY — Today's appointments table

| ID          | Scenario                           | Priority | Steps                                           | Expected                                                                                                                  |
| ----------- | ---------------------------------- | -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| T6-TODAY.01 | Table renders today's appts        | High     | Login receptionist → /receptionist/appointments | 3 rows (appt1 CONFIRMED, appt2 CHECKED_IN, appt3 COMPLETED)                                                               |
| T6-TODAY.02 | Columns correct                    | High     | Inspect table                                   | Time, patient name, MRN, doctor, status badge                                                                             |
| T6-TODAY.03 | Status badges correct              | High     | Inspect badges                                  | CONFIRMED / CHECKED_IN / COMPLETED styled distinctly                                                                      |
| T6-TODAY.04 | Ordered by time asc                | Medium   | Inspect order                                   | 09:00, 09:30, 10:00                                                                                                       |
| T6-TODAY.05 | Stats row present                  | Medium   | Inspect top                                     | Today's Total=3, Checked In=1, Waiting=1, Completed=1                                                                     |
| T6-TODAY.06 | Filter by doctor                   | High     | Filter by Dr. Rajesh Mehta                      | Only appt1 shown                                                                                                          |
| T6-TODAY.07 | Filter by status                   | High     | Filter by CONFIRMED                             | Only appt1 shown                                                                                                          |
| T6-TODAY.08 | COMPLETED row has Generate Invoice | Medium   | Inspect appt3 row                               | "Generate Invoice" button (may link to T10 placeholder)                                                                   |
| T6-TODAY.09 | Empty state                        | Medium   | Day with no appts (filter yields none)          | Friendly empty state, no crash                                                                                            |
| T6-TODAY.10 | Admin can view table               | Medium   | Login admin → /receptionist/appointments        | Redirected (admin not receptionist) — OR if admin route exists, authorized via getTodaysAppointments (RECEPTIONIST/ADMIN) |

### T6-CHECKIN — Check-in

| ID            | Scenario                            | Priority | Steps                                    | Expected                                                |
| ------------- | ----------------------------------- | -------- | ---------------------------------------- | ------------------------------------------------------- |
| T6-CHECKIN.01 | Check-in button on CONFIRMED row    | High     | Inspect appt1 row                        | "Check In" button present                               |
| T6-CHECKIN.02 | Check-in sets CHECKED_IN            | High     | Click Check In on appt1                  | Status → CHECKED_IN; badge updates; button disappears   |
| T6-CHECKIN.03 | Stats update after check-in         | Medium   | After check-in                           | Checked In +1, Waiting +1                               |
| T6-CHECKIN.04 | Cannot check-in non-CONFIRMED       | High     | Attempt check-in on CHECKED_IN/COMPLETED | Error "Only confirmed appointments can be checked in"   |
| T6-CHECKIN.05 | No check-in button on non-CONFIRMED | Medium   | Inspect appt2 (CHECKED_IN) row           | No Check In button                                      |
| T6-CHECKIN.06 | Patient cannot check-in             | High     | As patient, call checkInAppointment      | Unauthorized                                            |
| T6-CHECKIN.07 | Doctor dashboard reflects check-in  | Medium   | After check-in, login doctor             | (If doctor dashboard shows queue) patient appears ready |

### T6-NOSHOW — No-show marking

| ID           | Scenario                      | Priority | Steps                                              | Expected                                                      |
| ------------ | ----------------------------- | -------- | -------------------------------------------------- | ------------------------------------------------------------- |
| T6-NOSHOW.01 | Mark no-show on CHECKED_IN    | High     | On appt2 (CHECKED_IN) → mark no-show               | Status → NO_SHOW                                              |
| T6-NOSHOW.02 | Cannot no-show non-CHECKED_IN | High     | Mark no-show on CONFIRMED appt                     | Error "Only checked-in appointments can be marked as no-show" |
| T6-NOSHOW.03 | Doctor can mark no-show       | Medium   | Login doctor, call markNoShow on a CHECKED_IN appt | Succeeds (DOCTOR authorized)                                  |
| T6-NOSHOW.04 | Patient cannot mark no-show   | High     | As patient, call markNoShow                        | Unauthorized                                                  |
| T6-NOSHOW.05 | No-show recorded              | Medium   | Inspect DB after no-show                           | status NO_SHOW                                                |

### T6-BOOKBEHALF — Book on behalf

| ID               | Scenario                              | Priority | Steps                                                 | Expected                                                                             |
| ---------------- | ------------------------------------- | -------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| T6-BOOKBEHALF.01 | Book-on-behalf entry                  | High     | Receptionist → /receptionist/book                     | Starts with patient search/selection step                                            |
| T6-BOOKBEHALF.02 | Search then book                      | High     | Search "Rahul" → select → complete wizard             | Appointment created for Rahul under receptionist's action                            |
| T6-BOOKBEHALF.03 | PatientId required for receptionist   | Medium   | Receptionist book w/o selecting patient               | Error "Patient is required"                                                          |
| T6-BOOKBEHALF.04 | Booked appt appears in patient's list | High     | After booking for Rahul, login as Rahul               | New appt visible in /patient/appointments                                            |
| T6-BOOKBEHALF.05 | Double-booking prevented on behalf    | High     | Book Rahul into an already-booked slot                | Error "slot already booked"                                                          |
| T6-BOOKBEHALF.06 | Patient cannot book for others        | High     | As patient, pass another patientId in bookAppointment | Action ignores inputPatientId (uses own patientId) — verify no cross-patient booking |

### T6-WALKIN — Walk-in shortcut

| ID           | Scenario                      | Priority | Steps                             | Expected                                                    |
| ------------ | ----------------------------- | -------- | --------------------------------- | ----------------------------------------------------------- |
| T6-WALKIN.01 | Walk-in side panel form       | High     | Receptionist dashboard side panel | Compact form: name + phone                                  |
| T6-WALKIN.02 | Quick create → immediate book | High     | Enter name+phone → create → book  | Patient created (no User); can immediately book appointment |
| T6-WALKIN.03 | Walk-in validation            | Medium   | Submit empty                      | Errors on name/phone                                        |
| T6-WALKIN.04 | Walk-in MRN generated         | Medium   | After walk-in create              | MRN assigned (MRN-XXXXX)                                    |
| T6-WALKIN.05 | Find patient by phone         | Medium   | Enter partial phone (≥4 digits)   | Returns matching patient                                    |
| T6-WALKIN.06 | Find by phone min 4 digits    | Medium   | Enter 3 digits                    | Error "Enter at least 4 digits"                             |
| T6-WALKIN.07 | No patient for phone          | Medium   | Enter unmatched phone             | Error "No patient found"                                    |

---

## X — Cross-cutting / integration / regression

| ID   | Scenario                                     | Priority | Steps                                                 | Expected                                                                                               |
| ---- | -------------------------------------------- | -------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| X.01 | Middleware redirects wrong role              | High     | Login patient → visit /admin                          | Redirected to /patient                                                                                 |
| X.02 | Middleware redirects unauthenticated         | High     | Logged out → visit /patient                           | Redirected to /login?callbackUrl=/patient                                                              |
| X.03 | Role route map exhaustive                    | Medium   | Each role visits every other role's prefix            | Always redirected to own dashboard                                                                     |
| X.04 | Dark mode only (no light theme)              | Medium   | Inspect all pages                                     | slate-900/950 surfaces, slate-100/300 text, blue-600 primary, teal-500 accent; no theme toggle         |
| X.05 | shadcn components used (no raw inputs)       | Low      | View-source across pages                              | No raw `<input>/<select>/<textarea>/<button>`; all shadcn equivalents                                  |
| X.06 | Console error-free on all role dashboards    | High     | Login each role, check console                        | No uncaught errors                                                                                     |
| X.07 | Full booking → check-in → no-show lifecycle  | High     | Patient books → receptionist checks in → mark no-show | Status transitions CONFIRMED→CHECKED_IN→NO_SHOW                                                        |
| X.08 | Full booking → check-in → complete lifecycle | Medium   | Book → check-in → (doctor completes)                  | CONFIRMED→CHECKED_IN→COMPLETED (if complete action exists)                                             |
| X.09 | Cancel frees slot for rebook                 | High     | Book → cancel → rebook same slot                      | Second booking succeeds                                                                                |
| X.10 | Reschedule then cancel                       | Medium   | Book → reschedule → cancel new appt                   | Original freed, new cancelled                                                                          |
| X.11 | Seed data integrity after test pass          | Medium   | Re-run `pnpm db:seed` after manual tests              | Idempotent upserts; no unique-constraint failures from test-created rows (cleanup or upsert tolerance) |
| X.12 | Server action auth is real boundary          | High     | Bypass UI, call actions w/ wrong role session         | All actions throw Unauthorized independent of middleware                                               |
| X.13 | Date handling UTC-midnight                   | Medium   | Book on a date, verify stored date                    | Stored as UTC midnight (toDateUTC); matches across timezones                                           |
| X.14 | Landing page redirects authed users          | Medium   | Login, visit /                                        | Redirects to role dashboard                                                                            |
| X.15 | Landing page public when logged out          | Low      | Logged out, visit /                                   | Landing renders (departments, fallback data)                                                           |

---

## D — Destructive / Adversarial Tests (try to break the system)

> **Mindset:** You are an attacker / careless user. The goal is NOT to confirm
> features work — it is to find inputs, sequences, and edge cases that crash
> the app, corrupt data, bypass security, or produce wrong results. Think:
> "what would a malicious or confused user try?" Test through the UI and via
> direct server-action calls (devtools network tab, fetch from console).

### D-AUTH — Authentication & session attacks

| ID        | Attack                                 | Priority | Steps                                                        | Expected (pass) / Bug (fail)                                           |
| --------- | -------------------------------------- | -------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| D-AUTH.01 | Login with SQL-ish payload in email    | High     | Email: `admin@carepoint.in' OR '1'='1`, any password         | Rejected gracefully, no SQL error leaked, no login                     |
| D-AUTH.02 | Login with very long email (10KB)      | Medium   | Paste 10000-char string in email field                       | No crash; validation error or graceful rejection                       |
| D-AUTH.03 | Login with email containing null byte  | Medium   | Email: `admin@carepoint.in\x00evil@test.in`                  | No login; no parse confusion                                           |
| D-AUTH.04 | Tamper JWT/session cookie              | High     | Edit session cookie value in devtools, reload                | Session invalidated; redirected to /login                              |
| D-AUTH.05 | Access /admin with no cookie at all    | High     | curl `/admin` with no cookies                                | 302 to /login                                                          |
| D-AUTH.06 | Role escalation via crafted signup     | High     | Signup form: intercept request, inject `role: "ADMIN"` field | Created user is PATIENT, not ADMIN                                     |
| D-AUTH.07 | Replays signup with same email rapidly | Medium   | Submit signup form 5x fast (same email)                      | Only 1 user created; others rejected with "already exists"             |
| D-AUTH.08 | Login then logout then use back button | Medium   | Login → logout → browser back to /admin                      | Redirected to /login (no cached authed page)                           |
| D-AUTH.09 | Password with only spaces              | Medium   | Signup with password " " (6 spaces)                          | Rejected or treated as invalid (not accepted as valid 6-char password) |
| D-AUTH.10 | Email case-sensitivity bypass          | Medium   | Signup with Admin@Carepoint.in (different case)              | Treated as duplicate / rejected, not a second account                  |

### D-INPUT — Malformed & malicious input (all free-text fields)

> Apply to: signup fields, patient registration, edit demographics, appointment
> reason, blocked-date reason, allergies, medical history, address, emergency
> contact name. Substitute `<FIELD>` with each.

| ID         | Attack                            | Priority | Steps                                       | Expected / Bug                                                  |
| ---------- | --------------------------------- | -------- | ------------------------------------------- | --------------------------------------------------------------- |
| D-INPUT.01 | XSS in name field                 | High     | First name: `<script>alert('xss')</script>` | Stored as text; rendered escaped on all pages (no alert)        |
| D-INPUT.02 | XSS in medical history            | High     | History: `<img src=x onerror=alert(1)>`     | Rendered escaped; no script execution                           |
| D-INPUT.03 | HTML injection in address         | Medium   | Address: `<b>bold</b><iframe src=evil>`     | Displayed as plain text, not rendered as HTML                   |
| D-INPUT.04 | Very long string (10KB) in name   | Medium   | First name: 10000 'A's                      | No crash; either accepted or validation error; no DB error page |
| D-INPUT.05 | Unicode/emoji in name             | Low      | First name: `🎉 Rahül`                      | Accepted; displays correctly                                    |
| D-INPUT.06 | Null bytes in text                | Medium   | Reason: `checkup\x00malicious`              | No crash; stored/trimmed cleanly                                |
| D-INPUT.07 | Only whitespace in required field | High     | First name: `   ` (spaces only)             | Rejected as empty (not accepted as valid name)                  |
| D-INPUT.08 | Newlines in single-line fields    | Low      | Name: `Line1\nLine2`                        | No layout break; stored or trimmed                              |
| D-INPUT.09 | Special DB characters             | Medium   | Allergies: `'; DROP TABLE patients;--`      | Stored as literal text; no SQL error; DB intact                 |
| D-INPUT.10 | Phone with letters                | Medium   | Phone: `+91 abc def ghi`                    | Rejected or sanitized; not stored as-is                         |
| D-INPUT.11 | Phone with extreme length         | Medium   | Phone: 1000 digits                          | Rejected gracefully                                             |
| D-INPUT.12 | Email with multiple @             | Medium   | Email: `a@@b.com`                           | Rejected as invalid email                                       |
| D-INPUT.13 | Date of birth in the future       | Medium   | DOB: 2099-01-01                             | Rejected or warned (future birth date is nonsensical)           |
| D-INPUT.14 | Date of birth 200 years ago       | Low      | DOB: 1820-01-01                             | Accepted or warned; no crash                                    |
| D-INPUT.15 | Emergency phone = patient phone   | Low      | Emergency phone same as patient phone       | Accepted (not a bug per se, but check no circular logic)        |

### D-STATE — Appointment state-machine violations

> Goal: force illegal status transitions. Try every combination.

| ID         | Attack                                   | Priority | Steps                                   | Expected / Bug                                                   |
| ---------- | ---------------------------------------- | -------- | --------------------------------------- | ---------------------------------------------------------------- |
| D-STATE.01 | Check-in a CANCELLED appt                | High     | Call checkIn on a CANCELLED appointment | Rejected: "only confirmed can be checked in"                     |
| D-STATE.02 | Check-in a COMPLETED appt                | High     | Call checkIn on COMPLETED               | Rejected                                                         |
| D-STATE.03 | Check-in a NO_SHOW appt                  | High     | Call checkIn on NO_SHOW                 | Rejected                                                         |
| D-STATE.04 | Check-in an already CHECKED_IN           | High     | Check-in twice                          | Rejected (idempotent guard)                                      |
| D-STATE.05 | Cancel a CHECKED_IN appt                 | High     | Cancel after check-in                   | Rejected: "only confirmed can be cancelled"                      |
| D-STATE.06 | Cancel a COMPLETED appt                  | High     | Cancel a COMPLETED                      | Rejected                                                         |
| D-STATE.07 | Cancel a NO_SHOW appt                    | High     | Cancel a NO_SHOW                        | Rejected                                                         |
| D-STATE.08 | Reschedule a CANCELLED appt              | High     | Reschedule after cancel                 | Rejected                                                         |
| D-STATE.09 | Reschedule a CHECKED_IN appt             | High     | Reschedule after check-in               | Rejected                                                         |
| D-STATE.10 | Reschedule a COMPLETED appt              | High     | Reschedule a COMPLETED                  | Rejected                                                         |
| D-STATE.11 | No-show a CONFIRMED appt (skip check-in) | High     | Mark no-show without checking in        | Rejected: "only checked-in can be no-show"                       |
| D-STATE.12 | No-show a COMPLETED appt                 | High     | Mark no-show on COMPLETED               | Rejected                                                         |
| D-STATE.13 | No-show a CANCELLED appt                 | High     | Mark no-show on CANCELLED               | Rejected                                                         |
| D-STATE.14 | No-show an already NO_SHOW               | Medium   | Mark no-show twice                      | Rejected (idempotent)                                            |
| D-STATE.15 | Reschedule to same date+time (no-op)     | Medium   | Reschedule appt to its own current slot | Either no-op success or graceful rejection; no duplicate created |
| D-STATE.16 | Reschedule to past date                  | High     | Reschedule to yesterday                 | Rejected (can't book in the past)                                |
| D-STATE.17 | Cancel then reschedule the same ID       | High     | Cancel appt, then call reschedule on it | Rejected (status is CANCELLED)                                   |

### D-CONCURRENCY — Race conditions

| ID        | Attack                                     | Priority | Steps                                                                                                | Expected / Bug                                                                      |
| --------- | ------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| D-CONC.01 | Double-book same slot simultaneously       | High     | Two browser sessions (two patients), submit booking for same doctor+date+time within the same second | Only ONE succeeds; other gets "slot already booked"                                 |
| D-CONC.02 | MRN collision on simultaneous signups      | High     | Two signup submissions at the same time (two different emails)                                       | Both get unique MRNs; no duplicate MRN; no crash                                    |
| D-CONC.03 | MRN collision on simultaneous walk-in regs | High     | Two receptionist tabs, submit walk-in at same time                                                   | Both get unique MRNs                                                                |
| D-CONC.04 | Check-in + cancel race                     | Medium   | Tab A checks in appt; Tab B cancels same appt simultaneously                                         | Only one transition wins; no inconsistent state (not both CHECKED_IN and CANCELLED) |
| D-CONC.05 | Reschedule + cancel race                   | Medium   | Tab A reschedules; Tab B cancels same appt simultaneously                                            | No data loss; one operation wins cleanly                                            |
| D-CONC.06 | Delete schedule block while booking        | Medium   | Tab A deletes a schedule block; Tab B is mid-booking using that block                                | Booking either succeeds (snapshot) or fails gracefully; no 500                      |

### D-DATA — Data integrity & referential attacks

| ID        | Attack                                       | Priority | Steps                                                                  | Expected / Bug                                       |
| --------- | -------------------------------------------- | -------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| D-DATA.01 | Book appointment for non-existent doctor     | High     | Call bookAppointment with random UUID as doctorId                      | Rejected (FK violation caught) or "doctor not found" |
| D-DATA.02 | Book for non-existent patient (receptionist) | High     | Receptionist books with random patientId                               | Rejected gracefully                                  |
| D-DATA.03 | Edit non-existent patient                    | Medium   | updatePatient with random ID                                           | Rejected (no 500)                                    |
| D-DATA.04 | Delete non-existent schedule block           | Medium   | deleteScheduleBlock with random ID                                     | Graceful error, no 500                               |
| D-DATA.05 | Add blocked date for non-existent doctor     | Medium   | addBlockedDate with random doctorId                                    | Rejected gracefully                                  |
| D-DATA.06 | Search with empty string                     | Low      | searchPatients("")                                                     | Returns empty (not all patients)                     |
| D-DATA.07 | Search with special regex chars              | Medium   | searchPatients(".\*") or "("                                           | No regex error; treated as literal or empty          |
| D-DATA.08 | Reschedule to non-existent doctor's schedule | Medium   | Reschedule appt, new date has no schedule block for doctor             | Slots empty; can't proceed (or rejected)             |
| D-DATA.09 | Walk-in with duplicate MRN forced            | Medium   | (If MRN gen has a race) check DB for duplicate MRNs after D-CONC.02/03 | No duplicate MRNs exist                              |
| D-DATA.10 | Cancel frees slot — verify DB                | High     | Book slot → cancel → query appointments for that slot                  | No non-CANCELLED appt remains; slot is truly free    |

### D-ROUTE — Route & navigation attacks

| ID         | Attack                                              | Priority | Steps                                           | Expected / Bug                                       |
| ---------- | --------------------------------------------------- | -------- | ----------------------------------------------- | ---------------------------------------------------- |
| D-ROUTE.01 | Direct URL to /patient/book as admin                | High     | Login admin, visit /patient/book                | Redirected to /admin                                 |
| D-ROUTE.02 | Direct URL to /receptionist/appointments as patient | High     | Login patient, visit /receptionist/appointments | Redirected to /patient                               |
| D-ROUTE.03 | Visit non-existent route under role prefix          | Medium   | /admin/nonexistent                              | 404 page (not 500)                                   |
| D-ROUTE.04 | Path traversal in URL                               | Medium   | /admin/../../etc/passwd                         | Not served; 404 or redirect                          |
| D-ROUTE.05 | Visit /api/auth/\* endpoints directly               | Low      | curl /api/auth/session                          | Returns JSON (expected), no crash                    |
| D-ROUTE.06 | Rapid route switching (SPA nav)                     | Low      | Click nav items rapidly 20x                     | No crash; no stuck loading state                     |
| D-ROUTE.07 | Visit /login with invalid callbackUrl               | Medium   | /login?callbackUrl=javascript:alert(1)          | No XSS; redirect ignored or sanitized                |
| D-ROUTE.08 | Visit /login?callbackUrl=https://evil.com           | Medium   | Login, observe redirect                         | Does NOT redirect to external domain (open redirect) |

### D-DATE — Date & time edge cases

| ID        | Attack                                          | Priority | Steps                                                   | Expected / Bug                                 |
| --------- | ----------------------------------------------- | -------- | ------------------------------------------------------- | ---------------------------------------------- |
| D-DATE.01 | Book appointment in the past                    | High     | Wizard: manually set date to yesterday via URL/devtools | Rejected; can't select past date               |
| D-DATE.02 | Book on day 15+ (beyond 14-day window)          | Medium   | Modify date picker to allow day 20                      | Rejected or not selectable                     |
| D-DATE.03 | Book on a Saturday/Sunday (no schedule)         | High     | Pick a weekend                                          | No slots shown (schedule is Mon–Fri only)      |
| D-DATE.04 | Date string with wrong format                   | High     | Call bookAppointment with date="09-08-2026" (DD-MM)     | Rejected; not parsed as valid                  |
| D-DATE.05 | Date with invalid month/day                     | High     | date="2026-13-45"                                       | Rejected; no crash                             |
| D-DATE.06 | Time "25:99"                                    | High     | bookAppointment with startTime="25:99"                  | Rejected by regex/schema                       |
| D-DATE.07 | Time "9:00" (not zero-padded)                   | Medium   | startTime="9:00"                                        | Rejected (format is HH:mm)                     |
| D-DATE.08 | Blocked date exactly today                      | Medium   | Block today for a doctor, try to book                   | No slots for today                             |
| D-DATE.09 | Blocked date = appointment date (existing appt) | Medium   | Block a date that already has a CONFIRMED appt          | Existing appt unaffected; new bookings blocked |
| D-DATE.10 | Reschedule to today (same day)                  | Medium   | Reschedule appt from today to today different time      | Works if slot free                             |
| D-DATE.11 | DST / timezone boundary booking                 | Low      | Book at a date crossing DST boundary                    | Date stored correctly; no off-by-one           |

### D-UI — UI / rendering abuse

| ID      | Attack                                | Priority | Steps                                              | Expected / Bug                                        |
| ------- | ------------------------------------- | -------- | -------------------------------------------------- | ----------------------------------------------------- |
| D-UI.01 | Submit form with Enter key repeatedly | Medium   | Rapid-fire Enter on signup form                    | Only one submission; no duplicate users               |
| D-UI.02 | Double-click submit button            | High     | Double-click "Confirm Booking"                     | Only one appointment created                          |
| D-UI.03 | Double-click "Check In"               | High     | Double-click check-in button                       | Only one transition; no error                         |
| D-UI.04 | Disable JS mid-flow                   | Low      | Disable JavaScript in devtools mid-wizard          | Graceful degradation or clear error                   |
| D-UI.05 | Very narrow viewport (320px)          | Medium   | Set viewport to 320px width                        | No horizontal scroll; layout adapts                   |
| D-UI.06 | Zoom to 400%                          | Low      | Browser zoom 400%                                  | Content readable; no broken layout                    |
| D-UI.07 | Long patient name breaks table layout | Medium   | Patient with 200-char name in today's appointments | Table wraps or truncates; no layout overflow          |
| D-UI.08 | 20+ search results                    | Low      | Search returning many results                      | List scrolls; max 20 enforced                         |
| D-UI.09 | Rapid search typing                   | Medium   | Type fast in search box                            | No race-induced wrong results; debounced or last-wins |
| D-UI.10 | Back button after booking success     | Medium   | Complete booking → press browser back              | Doesn't re-submit booking; shows wizard or redirects  |

### D-MISC — Miscellaneous breakage attempts

| ID        | Attack                                                        | Priority | Steps                                                                           | Expected / Bug                                     |
| --------- | ------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- | -------------------------------------------------- |
| D-MISC.01 | Signup with password exactly 5 chars                          | Medium   | Password "12345"                                                                | Rejected (min 6)                                   |
| D-MISC.02 | Signup with password exactly 6 chars                          | Low      | Password "123456"                                                               | Accepted                                           |
| D-MISC.03 | Phone exactly 10 digits, no +91                               | Medium   | Phone "9876543210"                                                              | Accepted or rejected consistently (check behavior) |
| D-MISC.04 | Two patients same phone, different emails                     | Medium   | Signup patient A phone X; signup patient B phone X (continue anyway)            | Both created; search by phone returns both         |
| D-MISC.05 | Edit patient to empty first name                              | High     | Update patient firstName to ""                                                  | Rejected (min 1) or handled                        |
| D-MISC.06 | Book appointment with no reason (empty string)                | Low      | reason: ""                                                                      | Accepted (optional); stored as null not ""         |
| D-MISC.07 | Slot duration = 5 (minimum boundary)                          | Low      | Create schedule block with slotDuration=5                                       | Accepted                                           |
| D-MISC.08 | Slot duration = 4 (below minimum)                             | Medium   | slotDuration=4                                                                  | Rejected                                           |
| D-MISC.09 | Schedule block start=end                                      | Medium   | 09:00–09:00                                                                     | Rejected (start < end)                             |
| D-MISC.10 | Schedule block start > end                                    | Medium   | 13:00–09:00                                                                     | Rejected                                           |
| D-MISC.11 | dayOfWeek = 0 (Sunday) boundary                               | Low      | Create block day=0                                                              | Accepted                                           |
| D-MISC.12 | dayOfWeek = 6 (Saturday) boundary                             | Low      | Create block day=6                                                              | Accepted                                           |
| D-MISC.13 | dayOfWeek = 7 (out of range)                                  | Medium   | day=7                                                                           | Rejected                                           |
| D-MISC.14 | dayOfWeek = -1                                                | Medium   | day=-1                                                                          | Rejected                                           |
| D-MISC.15 | Book appointment, then delete the doctor's schedule block     | Medium   | Book appt → admin deletes the schedule block for that day                       | Existing appt intact; new slots for that day empty |
| D-MISC.16 | Block a date that's already passed                            | Medium   | Add blocked date for yesterday                                                  | Accepted or rejected — check behavior is sensible  |
| D-MISC.17 | Receptionist books for walk-in patient immediately            | High     | Walk-in create → book for that patient in same session                          | Works; appt linked to new patient                  |
| D-MISC.18 | Patient books for self while receptionist also books for them | Medium   | Patient books slot X; receptionist books slot X for same patient simultaneously | Only one succeeds (double-booking guard)           |
| D-MISC.19 | Generate Invoice on COMPLETED (T6)                            | Medium   | Click "Generate Invoice" on COMPLETED row                                       | Links to T10 (may be placeholder) — no 500         |
| D-MISC.20 | Rapid logout + login cycling                                  | Low      | Logout → login → logout → login 5x                                              | No session corruption; each login works            |

---

## Execution Checklist

- [ ] Environment: `pnpm dev` + `pnpm db:seed` green
- [ ] T1 (INF / SEED / NAV) — 20 cases
- [ ] T2 (LOGIN / SIGNUP / LOGOUT) — 30 cases
- [ ] T3 (REG / SEARCH / EDIT) — 30 cases
- [ ] T4 (DOCS / BLOCK / BLOCKED) — 26 cases
- [ ] T5 (WIZ / SLOTS / BOOK / RESCHED / CANCEL / MYAPPT) — 38 cases
- [ ] T6 (TODAY / CHECKIN / NOSHOW / BOOKBEHALF / WALKIN) — 30 cases
- [ ] X (cross-cutting) — 15 cases
- [ ] **D (destructive / adversarial) — 110 cases**
  - [ ] D-AUTH (auth & session) — 10
  - [ ] D-INPUT (malformed/malicious input) — 15
  - [ ] D-STATE (state-machine violations) — 17
  - [ ] D-CONC (race conditions) — 6
  - [ ] D-DATA (data integrity) — 10
  - [ ] D-ROUTE (route attacks) — 8
  - [ ] D-DATE (date/time edge cases) — 11
  - [ ] D-UI (UI/rendering abuse) — 10
  - [ ] D-MISC (miscellaneous) — 20
- [ ] File bugs in GitHub Issues for any failure (label `needs-triage`)

---

## T-CHAT — AI Chatbot

Coverage for the AI Health Assistant chatbot. Entry points: floating
`<ChatPanel>` (all dashboard pages) and full-page `<ChatPage>` (per-role
`/<role>/chat` routes). Backend: `POST /api/chat` (streamText + tools) and
`GET /api/chat` (history). Tools: 21 total (16 read + 5 write), role-filtered.

> **Prerequisites:** `pnpm dev` running, `pnpm db:seed` executed,
> `GOOGLE_GENERATIVE_AI_API_KEY` set in `.env` with a valid Google AI Studio
> key. Run `node scripts/test-chat.mjs` for automated e2e coverage.

### T-CHAT.1 — UI / Interaction (per role)

- [ ] T-CHAT.1.01 — Floating chat button renders on all dashboard pages
- [ ] T-CHAT.1.02 — Role badge correct (Admin/Doctor/Patient/Receptionist/Lab mode)
- [ ] T-CHAT.1.03 — Empty state renders ("Ask me anything about your health records")
- [ ] T-CHAT.1.04 — Suggested prompts render (role-specific, 2-3 prompts)
- [ ] T-CHAT.1.05 — Panel closes via Close (X) button
- [ ] T-CHAT.1.06 — No console errors on open/close

### T-CHAT.2 — Responsive Layout

- [ ] T-CHAT.2.01 — Mobile (≤640px): full-screen panel + dark overlay
- [ ] T-CHAT.2.02 — Desktop (≥768px): floating panel, no mobile overlay

### T-CHAT.3 — Backend / API

- [ ] T-CHAT.3.01 — GET /api/chat → 401 JSON when logged out (not 302 redirect)
- [ ] T-CHAT.3.02 — POST /api/chat → 401 JSON when logged out
- [ ] T-CHAT.3.03 — GET /api/chat?conversationId=<other user's> → 404 (scoped)

### T-CHAT.4 — Read Tool Flows (model-dependent)

- [ ] T-CHAT.4.01 — Doctor sees only own appointments (Rahul, not Sneha/Arjun)
- [ ] T-CHAT.4.02 — Patient gets reply without supplying patientId (auto-injected)
- [ ] T-CHAT.4.03 — Receptionist sees all today's appointments
- [ ] T-CHAT.4.04 — Lab technician gets lab queue reply
- [ ] T-CHAT.4.05 — Admin gets dashboard/appointments reply

### T-CHAT.5 — Write-Tool Confirmation Gate (model-dependent)

- [ ] T-CHAT.5.01 — Write tool returns `[CONFIRMATION REQUIRED]` marker (not direct execution)
- [ ] T-CHAT.5.02 — Cancel button aborts the write action

### T-CHAT.6 — Conversation Persistence

- [ ] T-CHAT.6.01 — Sequential messages reuse the same conversation (no fragmentation)
- [ ] T-CHAT.6.02 — History reloads on panel close/reopen

### T-CHAT.7 — Vitest Unit Tests

- [ ] T-CHAT.7.01 — `chat-tools.test.ts`: 11 registry/role tests pass
- [ ] T-CHAT.7.02 — `chat-tools-auth.test.ts`: 18 authorization/confirmation tests pass
- [ ] T-CHAT.7.03 — `chat-panel.test.tsx`: 12 UI tests pass (error, confirmation, empty bubble)
