# Chatbot QA Findings

**Date:** 2026-08-12
**Scope:** AI chatbot (`<ChatPanel>`, `<ChatPage>`, `/api/chat`, `chat-tools.ts`)
**Method:** Vitest unit tests + Playwright e2e harness (`scripts/test-chat.mjs`)

## Summary

| Category | Tests | PASS | FAIL | BLOCKED |
|----------|-------|------|------|---------|
| Vitest unit | 678 | 678 | 0 | 0 |
| E2e UI/API (non-model) | 35 | 35 | 0 | 0 |
| E2e model-dependent | 9 | 8 | 1 | 0 |
| **Total** | **722** | **721** | **1** | **0** |

The single e2e FAIL (T-CHAT.5.01) is a model-capability limitation of
`gemini-flash-lite-latest`, which doesn't call write tools in e2e. The
confirmation gate is verified by 6 Vitest unit tests that directly test the
tool `execute` functions.

## Issues Found & Fixed

### 1. Write tools executed without user confirmation (CRITICAL SAFETY)

**Before:** All 5 write tools (`bookAppointment`, `cancelAppointment`,
`orderLabTest`, `createPrescriptionItem`, `recordPayment`) executed their
server actions immediately on the first call. The model could book/cancel
appointments, order lab tests, or record payments without the user ever
approving.

**Fix:** Two-phase confirmation gate. Each write tool now accepts a `confirm`
parameter (default `false`). When `confirm` is false, the tool returns a
`[CONFIRMATION REQUIRED]` pending-approval summary instead of executing. The
UI watches for this marker and renders Confirm/Cancel buttons. Only when the
user explicitly approves (clicking Confirm sends "Yes, please proceed.") does
the model re-invoke the tool with `confirm: true`, which executes the action.

**Verification:** 6 Vitest tests in `chat-tools-auth.test.ts` + e2e T-CHAT.5
(unit tests pass; e2e blocked by lite model limitation).

### 2. Cross-patient authorization missing (CRITICAL SECURITY)

**Before:** Tools like `getPatientTimeline`, `summarizeLastVisit`,
`listPrescriptions`, `showLabResults` accepted a `patientId` parameter with no
authorization check. Any authenticated user could pass any patient ID and read
another patient's records.

**Fix:** Added `authorizePatient()` helper that enforces:
- **PATIENT:** Always uses the session's `patientId`; rejects any other ID.
- **DOCTOR:** Requires a clinical relationship (appointment or consultation)
  with the patient.
- **RECEPTIONIST / ADMIN / LAB_TECHNICIAN:** Hospital-wide access (any patient).

**Verification:** 3 Vitest tests covering cross-patient rejection, auto-
injection, and doctor relationship check.

### 3. Doctor `showTodaysAppointments` showed ALL appointments (SECURITY)

**Before:** `showTodaysAppointments` returned all appointments for all doctors,
regardless of who was signed in. A doctor could see other doctors' patient
lists.

**Fix:** When the session role is `DOCTOR`, the query now filters by
`doctorId = session.user.profileId`.

**Verification:** Vitest test confirms `doctorId` filter is present for doctor
sessions and absent for receptionist sessions. E2e T-CHAT.4.01 confirms Dr.
Rajesh Mehta sees only Rahul (his patient), not Sneha or Arjun.

### 4. Patient couldn't use chat without knowing their patientId (UX)

**Before:** Patient-scoped tools required a `patientId` parameter. Patients
don't know their own patient ID, so tools like "when is my next appointment?"
would fail or ask the patient for an ID they don't have.

**Fix:** `authorizePatient()` auto-injects the session's `patientId` for
PATIENT role users. The `patientId` parameter is now optional in all patient-
facing tools.

**Verification:** E2e T-CHAT.4.02 — patient asks "When is my next appointment?"
and gets a valid reply without supplying a patientId.

### 5. Conversation history fragmentation (X-Conversation-Id not consumed)

**Before:** The server set the `X-Conversation-Id` response header, but the
client's `onFinish` callback voided the `message` object, preventing the
header from being read. Every message created a new `ChatConversation` row,
fragmenting history.

**Fix:** The server now uses `messageMetadata` in `toUIMessageStreamResponse`
to pass the `conversationId` through the stream itself. The client reads it
via `onFinish({ message })` → `message.metadata.conversationId` and includes
it in subsequent request bodies.

**Verification:** E2e T-CHAT.6.01 — two sequential messages reuse the same
conversation (count stays the same, not +2). T-CHAT.6.02 — history reloads on
reopen.

### 6. No error UI for stream/API failures (UX)

**Before:** When the model stream errored (429, 500, network failure), the UI
showed nothing — no error message, no retry option. The user saw a blank
"Thinking…" that never resolved.

**Fix:** The `MessageList` component now renders an error banner when
`useChat` returns an `error` object. The banner shows "Something went wrong"
with the error message.

**Verification:** Vitest test confirms the error banner renders with the error
message. E2e confirms the banner appears during 429 rate-limiting.

### 7. Empty assistant bubble on tool-only responses (UX)

**Before:** When the model called a tool but produced no text (tool-only
turn), the assistant bubble rendered as empty. On history reload, the
persisted message had empty content, showing a blank bubble.

**Fix:** The `onFinish` callback now persists `"(action completed)"` as the
content when `text` is empty but tool activity occurred. The `MessageList`
component also renders this placeholder for empty assistant messages.

**Verification:** Vitest test confirms the placeholder renders for empty
assistant messages.

### 8. API returned 302 redirect instead of 401 JSON (API)

**Before:** Unauthenticated requests to `/api/chat` got a 302 redirect to
`/login`, which API clients (fetch, useChat) couldn't handle — they'd follow
the redirect and get HTML instead of JSON.

**Fix:** Middleware now returns a 401 JSON response for unauthenticated `/api/`
requests. Browser routes still get the 302 redirect.

**Verification:** E2e T-CHAT.3.01 + T-CHAT.3.02 — GET and POST to `/api/chat`
return 401 JSON when logged out.

### 9. GET /api/chat not scoped to user (SECURITY)

**Before:** The GET endpoint loaded conversations and messages without
filtering by `userId`. Any authenticated user could read any other user's
conversations.

**Fix:** GET endpoint now filters by `userId: session.user.id` for both
conversation list and individual conversation fetch. Cross-user requests
return 404.

**Verification:** E2e T-CHAT.3.03 — requesting another user's conversation
returns 404.

### 10. SUGGESTED_PROMPTS / ROLE_BADGES / render logic drift (CODE QUALITY)

**Before:** `SUGGESTED_PROMPTS` and `ROLE_BADGES` were defined independently in
`chat-panel.tsx` and `chat-page.tsx`, with different values and rendering
logic. The two entry points could drift.

**Fix:** `ROLE_BADGES`, `SUGGESTED_PROMPTS`, and the `MessageList` component
are now defined once in `chat-tools.ts` / `message-list.tsx` and imported by
both entry points.

### 11. createPrescriptionItem had no doctor ownership check (SECURITY)

**Before:** `createPrescriptionItem` created rows in any prescription without
checking that the prescription belonged to a consultation owned by the signed-
in doctor.

**Fix:** When the session role is `DOCTOR`, the tool now verifies that the
prescription belongs to a consultation with `doctorId =
session.user.profileId`. Non-owned prescriptions are rejected.

**Verification:** Vitest test confirms a doctor can't add medicines to another
doctor's prescription.

### 12. Unsafe serialization of toolCalls/toolResults (RELIABILITY)

**Before:** The `onFinish` callback persisted `toolCalls` and `toolResults`
directly to Prisma. These objects could contain non-serializable values
(Date, BigInt, getters) that would crash the save.

**Fix:** Added `safeJson()` helper that does a `JSON.parse(JSON.stringify())`
round-trip wrapped in try/catch. Serialization failures no longer crash the
response.

## Architecture Changes

### Tool factory pattern (`chat-tools.ts`)

**Before:** Tools were defined as static objects with `execute` functions that
had no access to the session.

**After:** Tools are defined as factories `(session) => Tool`. The
`createChatTools(session)` function builds a role-filtered, session-scoped tool
map per request. This allows:
- Authorization checks using the session's `patientId` / `profileId`
- Doctor scoping in `showTodaysAppointments`
- Patient auto-injection in all patient-facing tools
- Doctor ownership check in `createPrescriptionItem`

### Shared UI components (`message-list.tsx`)

Extracted `MessageList`, `getMessageText`, and the confirmation card into a
shared component used by both `ChatPanel` and `ChatPage`. This eliminates the
render-logic drift between the two entry points.

## Test Coverage

### Vitest (678 tests, all passing)

- `chat-tools.test.ts` (11 tests) — registry shape, role filtering, system prompts
- `chat-tools-auth.test.ts` (18 new tests) — authorization, scoping, confirmation gate
- `chat-panel.test.tsx` (12 tests) — UI rendering, error banner, confirmation card, empty bubble

### Playwright e2e (44 tests: 43 PASS, 1 FAIL)

- T-CHAT.1 (30 tests) — UI/interaction per role (all PASS)
- T-CHAT.2 (2 tests) — Responsive layout (all PASS)
- T-CHAT.3 (3 tests) — API auth + scoping (all PASS)
- T-CHAT.4 (5 tests) — Read tool flows per role (all PASS)
- T-CHAT.5 (2 tests) — Write-tool confirmation gate (1 FAIL: lite model limitation)
- T-CHAT.6 (2 tests) — Conversation persistence + reuse (all PASS)

## Known Limitations

1. **`gemini-flash-lite-latest` doesn't call write tools in e2e.** The lite
   model prefers read tools and conversational responses over write-tool
   calls. The confirmation gate is verified by 6 unit tests. For full e2e
   write-tool testing, use `gemini-flash-latest` (non-lite) with adequate API
   quota.

2. **Gemini free-tier rate limits (20 RPM).** Rapid sequential model calls can
   hit 429 `RESOURCE_EXHAUSTED`. The harness includes 8-10s delays between
   model-dependent test sections to stay under the limit.

3. **Model changed from `gemini-flash-latest` to `gemini-flash-lite-latest`.**
   The route currently uses `gemini-flash-lite-latest` for testing. Switch
   back to `gemini-flash-latest` for production (better tool-calling).
