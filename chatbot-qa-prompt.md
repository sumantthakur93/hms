# Devin CLI Prompt — Chatbot QA + Fix Loop

You are a **senior QA engineer** assigned to debug and harden the AI chatbot in this
Hospital Management System (Next.js 15 + React 19 + Prisma/Supabase + Vercel AI SDK
with Google Gemini). Work in **agentic loops**: write/run tests → reproduce failures →
diagnose root cause → fix code → re-run tests → repeat until all issues are resolved.

## Hard constraints

- **You MAY edit code, run the dev server, run tests, and run Playwright.**
- **You MUST NOT push anything to git** (`git push`, force-push, opening PRs). Local
  commits are fine but not required. Do not change git config.
- **Follow `AGENTS.md` exactly:** dark mode only (slate-900/950, slate-100/300 text,
  blue-600 primary, teal-500 accent); **never** write raw `<input>`, `<select>`,
  `<textarea>`, `<button>`, `<label>` — use the shadcn/ui equivalents in
  `@/components/ui/` (`Button`, `Input`, `Textarea`, `Label`, `Select*`, `Card*`).
  If a component is missing, `npx shadcn@latest add <component>`.
- Do not add comments unless asked. Match existing code style. Don't introduce new
  dependencies without running the package manager (`pnpm add ...`).
- This is a real production app: apply security best practices. Never log secrets.

## Environment (already set up — verify, don't assume)

- Package manager: **pnpm**. Scripts: `pnpm dev` (Turbopack, http://localhost:3000),
  `pnpm test` (Vitest, jsdom), `pnpm db:seed`, `pnpm db:push`.
- Dev server is **already running on :3000**. Confirm with a curl before testing; if
  down, start it in the background (`pnpm dev`).
- `GOOGLE_GENERATIVE_AI_API_KEY` is set in `.env`. Playwright 1.62.1 is installed
  (`node_modules/.bin/playwright`). There is **no `@playwright/test` runner / config** —
  existing e2e is raw `playwright` scripts in `scripts/` (see `scripts/destructive-ui.mjs`
  and `scripts/test-chat-booking.mjs` for the established pattern: headless Chromium,
  login helper, console-error watcher, PASS/FAIL logger).
- Seed credentials (from `docs/qa/manual-test-plan.md`):
  - admin@carepoint.in / admin123 → `/admin`
  - receptionist@carepoint.in / reception123 → `/receptionist`
  - rajesh.mehta@carepoint.in / doctor123 → `/doctor`
  - rahul.kumar@gmail.com / patient123 → `/patient`
  - lab@carepoint.in / lab123 → `/lab`
    Run `pnpm db:seed` once before the first pass so today's appointments exist.

## The chatbot — what to test

Entry point: floating `<ChatPanel>` (`src/components/chat/chat-panel.tsx`) rendered via
`src/components/chat/chat-button.tsx`. There is also a full-page variant
`src/components/chat/chat-page.tsx`. Backend: `src/app/api/chat/route.ts` (POST streams,
GET loads history). Tools: `src/lib/chat-tools.ts` — **21 tools (16 read + 5 write)**,
role-filtered via `TOOLS_PER_ROLE`. Write tools: `bookAppointment`, `cancelAppointment`,
`orderLabTest`, `createPrescriptionItem`, `recordPayment`. Persistence:
`ChatConversation` / `ChatMessage` Prisma models.

Think like a senior QA engineer. Test **all** scenarios across **all 5 roles**
(ADMIN, DOCTOR, PATIENT, RECEPTIONIST, LAB_TECHNICIAN). Cover at minimum:

### UI / interaction

- Floating button renders; panel opens/closes; role badge correct per role.
- Suggested prompts render per role and actually submit when clicked.
- Empty state, user message (right-aligned), assistant message (markdown rendered),
  "Thinking…" loading state, auto-scroll.
- Send via Enter / submit button; disabled while streaming or on empty input.
- Mobile (≤640px) full-screen panel + overlay; desktop (≥768px) floating panel.
- Markdown: lists, bold, tables, links render correctly; empty assistant bubble
  (tool-only response with no text) is handled, not a blank bubble.
- Error surfacing: when `/api/chat` returns 401/500 or the stream errors, the user
  sees a clear error, not a silent hang.
- Attach (paperclip) button — currently a no-op; verify behavior is intentional or
  file a finding.
- Conversation history reloads on reopen (GET `/api/chat`).

### Backend / API

- POST `/api/chat` requires auth (401 when logged out); role filtering applied.
- Conversation + messages persisted; assistant response saved (incl. tool-only
  responses — check `content: text || ""` doesn't save empty for tool-only turns).
- `X-Conversation-Id` response header is emitted — **and actually consumed by the
  client** so subsequent messages reuse the same conversation (see known issues).
- `stopWhen: stepCountIs(5)` multi-step tool chains complete within `maxDuration=30`.
- Streaming error handling: missing/invalid Gemini key, model timeout, tool throw —
  must not crash the route or leave the client hanging.
- GET `/api/chat` (list) and GET `/api/chat?conversationId=...` (messages) auth +
  scoping (a user must not read another user's conversations).

### Tools / safety (most important)

- **Write tools must NOT execute without user confirmation.** The system prompts and
  `WRITE_TOOLS` set claim confirmation is required, but the route passes all tools
  with `execute` directly to `streamText`. Verify whether any confirmation gate
  exists; if not, this is a **critical** finding — booking/cancelling/paying/ordering
  labs/prescribing happen silently. Report it and implement a confirmation flow
  (e.g. tool returns a pending-approval payload; UI shows Confirm/Cancel; a second
  call executes). Match shadcn/ui for any new UI.
- **Per-record authorization inside tool `execute`**: tools rely only on the
  role-filtered tool list. Shared tools (`getPatientAppointments`, `listPrescriptions`,
  `showLabResults`, `cancelAppointment`, etc.) accept any `patientId`/`appointmentId`.
  Verify a PATIENT can fetch/act on _another_ patient's data. Report + fix.
- **DOCTOR `showTodaysAppointments`** — description says "for the current user (doctor)
  or all" but the query has no doctor filter. Doctor likely sees ALL appointments.
  Verify + fix to scope to the signed-in doctor.
- **PATIENT can't know their own `patientId`**: patient-scoped tools require
  `patientId`, but nothing injects the session's patientId. The patient has no way to
  call `getPatientNextAppointment` etc. Verify + fix (inject session patientId into
  patient tools, or add a "my profile" tool).
- Each read tool returns sensible empty states and doesn't throw on bad IDs.
- Each write tool's server-action guards (status transitions, double-booking) still
  hold when invoked from the chatbot.

### Drift / maintainability

- `SUGGESTED_PROMPTS` is defined in **three** places (`src/lib/chat-tools.ts`,
  `chat-panel.tsx`, `chat-page.tsx`) with **different** content. `ROLE_BADGES` and
  the whole message-rendering logic are duplicated between `ChatPanel` and `ChatPage`.
  Verify the drift, then consolidate to a single source of truth.

## Known / suspected issues (starting checklist — verify each, don't assume)

1. Write tools execute with no confirmation gate (critical safety).
2. `X-Conversation-Id` header never read into client state (`onFinish` does
   `void message`); `conversationId` stays null → every message creates a NEW
   conversation row. History fragmenting.
3. Doctor's "today's appointments" not filtered to the doctor.
4. Patient tools need `patientId` the patient doesn't have.
5. No authorization inside tool `execute` (cross-patient/cross-tenant access).
6. `SUGGESTED_PROMPTS` / `ROLE_BADGES` / render logic duplicated and drifted across
   `chat-tools.ts`, `chat-panel.tsx`, `chat-page.tsx`.
7. No error UI when the stream/API fails; `useChat` error not surfaced.
8. Attach button is a no-op.
9. Empty assistant bubble on tool-only responses.
10. `onFinish` saves `content: text || ""` → empty string for tool-only turns;
    `toolCalls`/`toolResults` use `JSON.parse(JSON.stringify(...))` hack.
11. Conversation title `updateMany` with `where title: "New conversation"` races.
12. No try/catch around `streamText` / streaming errors.

## How to work (agentic loop)

1. **Orient**: read `chat-panel.tsx`, `chat-page.tsx`, `chat-button.tsx`,
   `src/app/api/chat/route.ts`, `src/lib/chat-tools.ts`, the relevant server actions
   in `src/actions/`, and `src/__tests__/components/chat-panel.test.tsx`.
2. **Build a reproducible e2e harness**: add a Playwright script
   `scripts/test-chat.mjs` (follow `scripts/destructive-ui.mjs` conventions: headless
   Chromium, login helper, console-error watcher, PASS/FAIL logger, screenshots to
   `/tmp/`). Cover all 5 roles and the scenarios above. Use the seed creds.
   Also add/extend **Vitest unit tests** for `chat-panel` (error states, confirmation
   flow) and for tool logic where feasible.
3. **Run** the harness; capture every PASS/FAIL with console errors + screenshots.
4. **For each FAIL**: diagnose root cause (read the code path, add targeted logs),
   fix at the root, and add a regression test. Do not patch symptoms.
5. **Re-run** the full harness. Iterate until **every** scenario PASSes and
   `pnpm test` is green. Do not stop at the first green run — re-run the whole suite
   at least once more to catch state leakage / flakiness.
6. **Log findings** to `docs/qa/chatbot-findings.md` (one section per issue: test ID,
   repro, root cause, fix, status). Update `docs/qa/manual-test-plan.md` with a new
   `T-CHAT` section listing the cases you executed.
7. **Verify no regressions**: run `pnpm test` and your Playwright harness end-to-end
   after the final fixes. Confirm the dev server still boots cleanly and there are no
   new console errors on any role dashboard.

## Definition of done

- All chatbot scenarios across all 5 roles PASS in the Playwright harness.
- `pnpm test` (Vitest) is green, including new/updated chat tests.
- Critical safety issues (write-tool confirmation, cross-patient authorization,
  doctor/patient scoping) are fixed, not just documented.
- `docs/qa/chatbot-findings.md` documents every issue found and fixed.
- No git pushes were made. No raw HTML form elements introduced (shadcn/ui only).
- Summarize at the end: issues found, fixes applied, tests added, final run results.
- A full suite of tests pass via playwright after all code changes are done.
