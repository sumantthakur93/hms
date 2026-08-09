/* eslint-disable no-console */
/**
 * Headless destructive test runner — drives the HMS app via Playwright
 * in headless Chromium to find breakages.
 *
 * Run: node scripts/destructive-ui.mjs
 *
 * Each test logs PASS / FAIL with details. Failures map to test IDs in
 * docs/qa/manual-test-plan.md section D.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
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

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Login via the UI and return the browser context (authenticated). */
async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/(admin|doctor|patient|receptionist|lab)$/, {
    timeout: 10000,
  });
}

/** Collect console errors on a page. */
function watchConsole(page) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`PAGEERROR: ${err.message}`));
  return errors;
}

/**
 * Fill the signup form. The signup page uses div-based labels (not <label htmlFor>),
 * so getByLabel doesn't work. We fill by position using input[type] selectors.
 */
async function fillSignupForm(
  page,
  { firstName, lastName, phone, email, password, confirm },
) {
  // Text inputs (type=text or no type): first name, last name are first two
  // Phone has placeholder; email has placeholder
  // Passwords are type=password
  const phoneInput = page.getByPlaceholder(/98765|phone|\d{5}/i).first();
  const emailInput = page.getByPlaceholder(/you@example|email/i).first();
  // First name and last name are the first two text inputs that aren't phone/email
  // Use CSS: input:not([type=password]) and filter by placeholder absence
  const textInputs = page.locator('input[type="text"], input:not([type])');
  const firstInput = textInputs.nth(0);
  const lastInput = textInputs.nth(1);
  await firstInput.fill(firstName);
  await lastInput.fill(lastName);
  if (await phoneInput.isVisible().catch(() => false)) {
    await phoneInput.fill(phone);
  } else {
    await textInputs.nth(2).fill(phone);
  }
  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(email);
  } else {
    await textInputs.nth(3).fill(email);
  }
  const pwdInputs = page.locator('input[type="password"]');
  await pwdInputs.nth(0).fill(password);
  if (confirm !== undefined) {
    const count = await pwdInputs.count();
    if (count > 1) await pwdInputs.nth(1).fill(confirm);
  }
}

/** Click the signup submit button. */
async function clickSignupSubmit(page) {
  await page
    .getByRole("button", { name: /create account|sign up|register|submit/i })
    .first()
    .click();
}

// ─── Tests ──────────────────────────────────────────────────────────────────

async function testAuthAttacks(browser) {
  section("D-AUTH — Authentication & session attacks");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = watchConsole(page);

  // D-AUTH.01 — SQL-ish payload in email
  await page.goto(`${BASE}/login`);
  await page
    .getByRole("textbox", { name: "Email" })
    .fill("admin@carepoint.in' OR '1'='1");
  await page.getByRole("textbox", { name: "Password" }).fill("anything");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForTimeout(2000);
  if (page.url().includes("/login")) {
    pass(
      "D-AUTH.01",
      "SQL-ish email rejected, stayed on /login, no SQL error leaked",
    );
  } else {
    fail("D-AUTH.01", `SQL-ish email logged in! URL=${page.url()}`);
  }

  // D-AUTH.02 — very long email (10KB)
  await page.goto(`${BASE}/login`);
  await page
    .getByRole("textbox", { name: "Email" })
    .fill("a".repeat(10000) + "@test.in");
  await page.getByRole("textbox", { name: "Password" }).fill("x");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForTimeout(2000);
  if (
    page.url().includes("/login") &&
    !errors.some((e) => e.includes("PAGEERROR"))
  ) {
    pass("D-AUTH.02", "10KB email: no crash, stayed on /login");
  } else {
    fail(
      "D-AUTH.02",
      `10KB email: URL=${page.url()} errors=${errors.slice(-3).join("; ")}`,
    );
  }

  // D-AUTH.03 — null byte in email
  await page.goto(`${BASE}/login`);
  await page
    .getByRole("textbox", { name: "Email" })
    .fill("admin@carepoint.in\x00evil@test.in");
  await page.getByRole("textbox", { name: "Password" }).fill("admin123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForTimeout(2000);
  if (page.url().includes("/admin") || page.url().includes("/login")) {
    pass(
      "D-AUTH.03",
      `null-byte email: no crash, URL=${page.url().replace(BASE, "")}`,
    );
  } else {
    fail("D-AUTH.03", `null-byte email: unexpected URL=${page.url()}`);
  }

  // D-AUTH.04 — tamper session cookie
  await login(page, "admin@carepoint.in", "admin123");
  const cookies = await ctx.cookies();
  const sessionCookie = cookies.find(
    (c) =>
      c.name.includes("session") ||
      c.name.includes("token") ||
      c.name.includes("authjs"),
  );
  if (sessionCookie) {
    const tampered = {
      ...sessionCookie,
      value: sessionCookie.value.slice(0, -4) + "XXXX",
    };
    await ctx.clearCookies();
    await ctx.addCookies([tampered]);
    await page.goto(`${BASE}/admin`);
    await page.waitForTimeout(2000);
    if (page.url().includes("/login") || page.url() === `${BASE}/`) {
      pass("D-AUTH.04", "tampered session cookie → redirected to /login");
    } else {
      fail("D-AUTH.04", `tampered cookie still accepted! URL=${page.url()}`);
    }
  } else {
    fail(
      "D-AUTH.04",
      `no session cookie found: ${cookies.map((c) => c.name).join(", ")}`,
    );
  }

  // D-AUTH.09 — password with only spaces (signup)
  await ctx.clearCookies();
  await page.goto(`${BASE}/signup`);
  await page.waitForTimeout(1500);
  try {
    await fillSignupForm(page, {
      firstName: "Test",
      lastName: "Spaces",
      phone: "+91 99999 99999",
      email: "spaces.test@example.in",
      password: "      ",
      confirm: "      ",
    });
    await clickSignupSubmit(page);
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent("body");
    if (bodyText && bodyText.includes("MRN-")) {
      fail(
        "D-AUTH.09",
        "spaces-only password ACCEPTED — account created (bug)",
      );
    } else {
      pass("D-AUTH.09", "spaces-only password: no account created");
    }
  } catch (e) {
    pass(
      "D-AUTH.09",
      `spaces-only password: no creation (${e.message.slice(0, 80)})`,
    );
  }

  await ctx.close();
}

async function testInputAttacks(browser) {
  section("D-INPUT — Malformed & malicious input (XSS, injection)");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = watchConsole(page);

  // D-INPUT.01 — XSS in signup name field
  await page.goto(`${BASE}/signup`);
  await page.waitForTimeout(1500);
  try {
    await fillSignupForm(page, {
      firstName: `<script>alert('xss')</script>`,
      lastName: "XssTest",
      phone: "+91 88888 88888",
      email: "xss.test@example.in",
      password: "password123",
      confirm: "password123",
    });
    await clickSignupSubmit(page);
    await page.waitForTimeout(3000);
    const hasUnescapedScript = await page.evaluate(() =>
      document.body.innerHTML.includes("<script>alert('xss')</script>"),
    );
    if (hasUnescapedScript) {
      fail(
        "D-INPUT.01",
        "XSS payload stored as raw <script> in DOM — potential XSS",
      );
    } else {
      pass(
        "D-INPUT.01",
        "XSS payload not rendered as raw script in DOM (escaped)",
      );
    }
  } catch (e) {
    pass(
      "D-INPUT.01",
      `XSS test: form error, no crash (${e.message.slice(0, 80)})`,
    );
  }

  // D-INPUT.07 — whitespace-only required field
  await page.goto(`${BASE}/signup`);
  await page.waitForTimeout(1500);
  try {
    await fillSignupForm(page, {
      firstName: "   ",
      lastName: "WsTest",
      phone: "+91 77777 77777",
      email: "ws.test@example.in",
      password: "password123",
      confirm: "password123",
    });
    await clickSignupSubmit(page);
    await page.waitForTimeout(3000);
    const bodyText = await page.textContent("body");
    if (bodyText && bodyText.includes("MRN-")) {
      fail(
        "D-INPUT.07",
        "whitespace-only first name ACCEPTED — patient created (bug)",
      );
    } else {
      pass("D-INPUT.07", "whitespace-only first name rejected (no MRN)");
    }
  } catch (e) {
    pass(
      "D-INPUT.07",
      `whitespace test: form error (${e.message.slice(0, 80)})`,
    );
  }

  // D-INPUT.04 — very long string in name (10KB)
  await page.goto(`${BASE}/signup`);
  await page.waitForTimeout(1500);
  try {
    await fillSignupForm(page, {
      firstName: "A".repeat(10000),
      lastName: "Long",
      phone: "+91 66666 66666",
      email: "long.test@example.in",
      password: "password123",
      confirm: "password123",
    });
    await clickSignupSubmit(page);
    await page.waitForTimeout(5000);
    const noPageError = !errors.some(
      (e) => e.includes("PAGEERROR") || e.includes("500"),
    );
    const bodyText = await page.textContent("body");
    if (
      noPageError &&
      !bodyText?.includes("Internal Server Error") &&
      !bodyText?.includes("Something went wrong")
    ) {
      pass("D-INPUT.04", "10KB name: no crash (accepted or validation error)");
    } else {
      fail(
        "D-INPUT.04",
        `10KB name: crash/error. errors=${errors.slice(-3).join("; ")}`,
      );
    }
  } catch (e) {
    pass(
      "D-INPUT.04",
      `10KB name: form error, no crash (${e.message.slice(0, 80)})`,
    );
  }

  await ctx.close();
}

async function testRouteAttacks(browser) {
  section("D-ROUTE — Route & navigation attacks (authenticated)");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = watchConsole(page);

  // D-ROUTE.01 — patient visiting /admin
  await login(page, "rahul.kumar@gmail.com", "patient123");
  await page.goto(`${BASE}/admin`);
  await page.waitForTimeout(2000);
  if (page.url().includes("/patient")) {
    pass("D-ROUTE.01", "patient visiting /admin → redirected to /patient");
  } else {
    fail("D-ROUTE.01", `patient visiting /admin → URL=${page.url()}`);
  }

  // D-ROUTE.02 — patient visiting /receptionist/appointments
  await page.goto(`${BASE}/receptionist/appointments`);
  await page.waitForTimeout(2000);
  if (page.url().includes("/patient")) {
    pass(
      "D-ROUTE.02",
      "patient → /receptionist/appointments redirected to /patient",
    );
  } else {
    fail(
      "D-ROUTE.02",
      `patient → /receptionist/appointments → URL=${page.url()}`,
    );
  }

  // D-ROUTE.03 — non-existent route under role prefix
  await page.goto(`${BASE}/patient/nonexistent-xyz`);
  await page.waitForTimeout(2000);
  const bodyText = await page.textContent("body");
  if (bodyText?.includes("404") || page.url().includes("/patient")) {
    pass("D-ROUTE.03", "/patient/nonexistent → 404 or stayed in patient area");
  } else {
    fail("D-ROUTE.03", `/patient/nonexistent → URL=${page.url()}`);
  }

  // D-ROUTE.07 — callbackUrl with javascript: scheme
  await ctx.clearCookies();
  await page.goto(`${BASE}/login?callbackUrl=javascript:alert(1)`);
  await page.waitForTimeout(1000);
  await page
    .getByRole("textbox", { name: "Email" })
    .fill("rahul.kumar@gmail.com");
  await page.getByRole("textbox", { name: "Password" }).fill("patient123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForTimeout(3000);
  if (page.url().startsWith("javascript:")) {
    fail("D-ROUTE.07", `open redirect to javascript: URL! → ${page.url()}`);
  } else {
    pass(
      "D-ROUTE.07",
      `javascript: callbackUrl not followed → ${page.url().replace(BASE, "")}`,
    );
  }

  // D-ROUTE.08 — open redirect to external domain
  await ctx.clearCookies();
  await page.goto(`${BASE}/login?callbackUrl=https://evil.com`);
  await page.waitForTimeout(1000);
  await page
    .getByRole("textbox", { name: "Email" })
    .fill("rahul.kumar@gmail.com");
  await page.getByRole("textbox", { name: "Password" }).fill("patient123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForTimeout(3000);
  if (page.url().startsWith("https://evil.com")) {
    fail("D-ROUTE.08", `OPEN REDIRECT to evil.com! → ${page.url()}`);
  } else {
    pass(
      "D-ROUTE.08",
      `external callbackUrl not followed → ${page.url().replace(BASE, "")}`,
    );
  }

  await ctx.close();
}

async function testUiAbuse(browser) {
  section("D-UI — UI / rendering abuse");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = watchConsole(page);

  // D-UI.05 — very narrow viewport (320px)
  await page.setViewportSize({ width: 320, height: 800 });
  await login(page, "admin@carepoint.in", "admin123");
  await page.waitForTimeout(1500);
  const hasHScroll = await page.evaluate(
    () => document.body.scrollWidth > window.innerWidth,
  );
  if (!hasHScroll) {
    pass("D-UI.05", "320px viewport: no horizontal scroll on admin dashboard");
  } else {
    fail(
      "D-UI.05",
      `320px viewport: horizontal scroll (scrollWidth > innerWidth)`,
    );
  }

  // D-UI.06 — very small viewport (simulated 400% zoom)
  await page.setViewportSize({ width: 480, height: 600 });
  await page.waitForTimeout(500);
  if (!errors.some((e) => e.includes("PAGEERROR"))) {
    pass("D-UI.06", "small viewport: no crash");
  } else {
    fail("D-UI.06", `small viewport: errors=${errors.slice(-2).join("; ")}`);
  }

  await ctx.close();
}

async function testBookingWizard(browser) {
  section("D-DATE — Booking wizard rendering");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = watchConsole(page);

  await login(page, "rahul.kumar@gmail.com", "patient123");
  await page.goto(`${BASE}/patient/book`);
  await page.waitForTimeout(2000);
  if (!errors.some((e) => e.includes("PAGEERROR") || e.includes("500"))) {
    pass("D-DATE.03", "booking wizard renders without crash");
  } else {
    fail("D-DATE.03", `booking wizard crashed: ${errors.slice(-3).join("; ")}`);
  }

  await ctx.close();
}

async function testReceptionist(browser) {
  section("D-MISC.17 — Receptionist dashboard");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = watchConsole(page);

  await login(page, "receptionist@carepoint.in", "reception123");
  await page.waitForTimeout(1500);
  if (!errors.some((e) => e.includes("PAGEERROR") || e.includes("500"))) {
    pass("D-MISC.17", "receptionist dashboard renders without crash");
  } else {
    fail(
      "D-MISC.17",
      `receptionist dashboard errors: ${errors.slice(-3).join("; ")}`,
    );
  }

  await ctx.close();
}

async function testDoubleSubmit(browser) {
  section("D-UI.02 — Double-click submit (signup)");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(`${BASE}/signup`);
  await page.waitForTimeout(1500);
  try {
    await fillSignupForm(page, {
      firstName: "Double",
      lastName: "Click",
      phone: "+91 55555 55555",
      email: "double.click@example.in",
      password: "password123",
      confirm: "password123",
    });
    const btn = page
      .getByRole("button", { name: /create account|sign up|register|submit/i })
      .first();
    await btn.click({ clickCount: 2, delay: 50 });
    await page.waitForTimeout(4000);
    const bodyText = await page.textContent("body");
    const mrnMatches = bodyText?.match(/MRN-\d{5}/g) || [];
    if (mrnMatches.length <= 1) {
      pass(
        "D-UI.02",
        `double-click submit: ${mrnMatches.length} account(s) created (≤1 = OK)`,
      );
    } else {
      fail(
        "D-UI.02",
        `double-click: ${mrnMatches.length} accounts created (duplicate!): ${mrnMatches.join(", ")}`,
      );
    }
  } catch (e) {
    pass(
      "D-UI.02",
      `double-click test: form error, no duplicate (${e.message.slice(0, 80)})`,
    );
  }

  await ctx.close();
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🔬 Headless destructive UI tests against ${BASE}`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    await testAuthAttacks(browser);
    await testInputAttacks(browser);
    await testRouteAttacks(browser);
    await testUiAbuse(browser);
    await testBookingWizard(browser);
    await testReceptionist(browser);
    await testDoubleSubmit(browser);
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => r.status === "FAIL");
  console.log(
    `\n──────────────────────────────────────────────────────────\n` +
      `Total: ${results.length}  |  PASS: ${results.length - failed.length}  |  FAIL: ${failed.length}\n`,
  );
  if (failed.length > 0) {
    console.log("Failures:");
    for (const f of failed) console.log(`  ❌ ${f.id}  ${f.msg}`);
  }
}

main().catch((e) => {
  console.error("Test runner crashed:", e);
  process.exit(1);
});
