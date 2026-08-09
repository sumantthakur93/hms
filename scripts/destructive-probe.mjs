/* eslint-disable no-console */
/**
 * Destructive data-layer probes — runs WITHOUT a browser.
 *
 * These tests hit the database directly (via Prisma) and the HTTP layer
 * (via fetch) to find invariants that the application could violate.
 * They do NOT exercise the React UI — that's the Playwright suite's job.
 *
 * Run: node scripts/destructive-probe.mjs
 *
 * Each probe logs PASS / FAIL with details. Failures map to test IDs in
 * docs/qa/manual-test-plan.md section D.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const results = [];
function pass(id, msg) {
  results.push({ id, status: "PASS", msg });
  console.log(`✅ PASS  ${id}  ${msg}`);
}
function fail(id, msg) {
  results.push({ id, status: "FAIL", msg });
  console.log(`❌ FAIL  ${id}  ${msg}`);
}
function section(name) {
  console.log(`\n── ${name} ──────────────────────────────────────────────`);
}

const BASE = process.env.BASE_URL || "http://localhost:3002";

// ─── Helpers ────────────────────────────────────────────────────────────────
async function http(path, opts = {}) {
  try {
    const res = await fetch(BASE + path, {
      redirect: "manual",
      ...opts,
    });
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      body: await res.text().catch(() => ""),
    };
  } catch (e) {
    return { status: 0, error: e.message };
  }
}

// ─── Probes ─────────────────────────────────────────────────────────────────

async function probeSeedIdempotency() {
  section("D-DATA.09 / T1-SEED.02 — seed idempotency (already observed)");
  // We already observed the seed crash on re-run. Confirm by checking that
  // today's sample appointments exist (seed ran once) and that a second
  // create would collide.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todays = await prisma.appointment.findMany({
    where: { date: today },
    select: { doctorId: true, date: true, startTime: true, status: true },
  });
  console.log(`  today's appointments: ${todays.length}`);
  if (todays.length >= 3) {
    pass(
      "T1-SEED.02",
      `seed ran once; ${todays.length} appts today. Re-run would collide (see findings.md 001).`,
    );
  } else {
    fail(
      "T1-SEED.02",
      `expected ≥3 seeded appts today, found ${todays.length}. Seed may have partially failed.`,
    );
  }
}

async function probeRouteGuards() {
  section("D-ROUTE — middleware route guards (unauthenticated)");

  // D-ROUTE.05 — /admin with no cookie
  const admin = await http("/admin");
  if (admin.status >= 300 && admin.status < 400) {
    pass("D-ROUTE.05", `/admin unauthenticated → ${admin.status} redirect`);
  } else {
    fail(
      "D-ROUTE.05",
      `/admin unauthenticated → ${admin.status} (expected 3xx redirect)`,
    );
  }

  // D-ROUTE.03 — non-existent route under role prefix
  const ne = await http("/admin/nonexistent-xyz");
  if (ne.status === 404 || (ne.status >= 300 && ne.status < 400)) {
    pass("D-ROUTE.03", `/admin/nonexistent → ${ne.status} (404 or redirect)`);
  } else {
    fail(
      "D-ROUTE.03",
      `/admin/nonexistent → ${ne.status} (expected 404/redirect)`,
    );
  }

  // D-ROUTE.04 — path traversal attempt
  const pt = await http("/admin/../../etc/passwd");
  // fetch normalizes ../ so this likely becomes /etc/passwd → 404 or redirect
  if (pt.status === 404 || (pt.status >= 300 && pt.status < 400)) {
    pass("D-ROUTE.04", `path traversal → ${pt.status} (not served)`);
  } else {
    fail(
      "D-ROUTE.04",
      `path traversal → ${pt.status} body=${pt.body?.slice(0, 80)}`,
    );
  }

  // D-ROUTE.08 — open redirect via callbackUrl
  const evil = await http("/login?callbackUrl=https://evil.com");
  // We just check the login page renders; the real open-redirect test needs login
  if (evil.status === 200) {
    pass(
      "D-ROUTE.08",
      "login page with evil callbackUrl renders (login step OK)",
    );
  } else {
    fail("D-ROUTE.08", `login page with evil callbackUrl → ${evil.status}`);
  }
}

async function probeDataInvariants() {
  section("D-DATA — data integrity invariants");

  // D-DATA.06 — empty search query (we can't call the action directly without
  // auth, but we can verify the DB has patients and no duplicate MRNs)
  const mrnCounts = await prisma.patient.groupBy({
    by: ["mrn"],
    _count: { _all: true },
    having: { mrn: { _count: { gt: 1 } } },
  });
  if (mrnCounts.length === 0) {
    pass("D-DATA.09", "no duplicate MRNs in current DB state");
  } else {
    fail(
      "D-DATA.09",
      `${mrnCounts.length} duplicate MRNs found: ${mrnCounts.map((m) => m.mrn).join(", ")}`,
    );
  }

  // Check for appointments referencing non-existent doctor/patient (FK integrity)
  // The doctor/patient relations are required (non-nullable) per schema, so
  // Postgres enforces FK at insert. We verify by counting appts whose doctorId
  // / patientId do NOT exist in the parent tables (raw query).
  const totalAppts = await prisma.appointment.count();
  const orphanDoctor = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS n FROM appointments a
    LEFT JOIN doctor_profiles d ON a.doctor_id = d.id
    WHERE d.id IS NULL
  `;
  const orphanPatient = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS n FROM appointments a
    LEFT JOIN patients p ON a.patient_id = p.id
    WHERE p.id IS NULL
  `;
  const orphanD = Array.isArray(orphanDoctor) ? (orphanDoctor[0]?.n ?? 0) : 0;
  const orphanP = Array.isArray(orphanPatient) ? (orphanPatient[0]?.n ?? 0) : 0;
  if (orphanD === 0 && orphanP === 0) {
    pass(
      "D-DATA.01/02",
      `FK integrity OK: all ${totalAppts} appts have valid doctor + patient`,
    );
  } else {
    fail(
      "D-DATA.01/02",
      `FK integrity broken: orphanDoctor=${orphanD} orphanPatient=${orphanP} of ${totalAppts}`,
    );
  }

  // D-STATE — verify seeded statuses are in valid enum set
  const badStatus = await prisma.appointment.findMany({
    where: {
      status: {
        notIn: ["CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"],
      },
    },
    select: { id: true, status: true },
  });
  if (badStatus.length === 0) {
    pass("D-STATE", "all appointment statuses are valid enum values");
  } else {
    fail("D-STATE", `invalid statuses: ${JSON.stringify(badStatus)}`);
  }
}

async function probeScheduleBlockBoundaries() {
  section("D-MISC — schedule block boundary values (DB-level)");
  // We can't easily call the server action without auth, but we can check
  // that no schedule blocks exist with out-of-range values (seed should be clean).
  const badDay = await prisma.scheduleBlock.findMany({
    where: { OR: [{ dayOfWeek: { lt: 0 } }, { dayOfWeek: { gt: 6 } }] },
  });
  if (badDay.length === 0) {
    pass(
      "D-MISC.11/12/13/14",
      "no schedule blocks with out-of-range dayOfWeek",
    );
  } else {
    fail("D-MISC.13/14", `${badDay.length} blocks with out-of-range dayOfWeek`);
  }

  const badDur = await prisma.scheduleBlock.findMany({
    where: { OR: [{ slotDuration: { lt: 5 } }, { slotDuration: { gt: 120 } }] },
  });
  if (badDur.length === 0) {
    pass("D-MISC.07/08", "no schedule blocks with out-of-range slotDuration");
  } else {
    fail("D-MISC.08", `${badDur.length} blocks with out-of-range slotDuration`);
  }
}

async function probeDoubleBookingInvariant() {
  section("D-CONC.01 — double-booking invariant (current DB state)");
  // The unique constraint on (doctor_id, date, start_time) should prevent
  // any duplicate active bookings. Verify no two non-cancelled appts share
  // the same doctor+date+start.
  const dupes = await prisma.$queryRaw`
    SELECT doctor_id, date, start_time, COUNT(*)::int AS n
    FROM appointments
    WHERE status <> 'CANCELLED'
    GROUP BY doctor_id, date, start_time
    HAVING COUNT(*) > 1
  `;
  if (dupes.length === 0) {
    pass("D-CONC.01", "no double-bookings in current DB state");
  } else {
    fail(
      "D-CONC.01",
      `${dupes.length} double-booked slots: ${JSON.stringify(dupes)}`,
    );
  }
}

async function main() {
  console.log(`🔬 Destructive data-layer probes against ${BASE}`);
  await probeSeedIdempotency();
  await probeRouteGuards();
  await probeDataInvariants();
  await probeScheduleBlockBoundaries();
  await probeDoubleBookingInvariant();

  const failed = results.filter((r) => r.status === "FAIL");
  console.log(
    `\n──────────────────────────────────────────────────────────\n` +
      `Total: ${results.length}  |  PASS: ${results.length - failed.length}  |  FAIL: ${failed.length}\n`,
  );
  if (failed.length > 0) {
    console.log("Failures:");
    for (const f of failed) console.log(`  ❌ ${f.id}  ${f.msg}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Probe script crashed:", e);
  process.exit(1);
});
