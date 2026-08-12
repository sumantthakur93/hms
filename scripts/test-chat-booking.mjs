// Playwright non-headless test: receptionist books an appointment via chatbot.
// Full booking flow with extended wait for multi-step tool calls.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const EMAIL = "receptionist@carepoint.in";
const PASSWORD = "reception123";

const consoleLogs = [];
const pageErrors = [];

const browser = await chromium.launch({ headless: false, slowMo: 100 });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();

page.on("console", (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => pageErrors.push(err.message));

async function snap(label) {
  await page.screenshot({
    path: `/tmp/chat-book-${label}.png`,
    fullPage: true,
  });
  console.log(`📸 /tmp/chat-book-${label}.png`);
}

async function getAssistantTexts() {
  return await page.evaluate(() => {
    const bubbles = document.querySelectorAll(".flex.justify-start > div");
    const texts = [];
    for (const b of bubbles) {
      if (
        b.textContent &&
        b.textContent.trim() &&
        !b.textContent.includes("Thinking")
      ) {
        texts.push(b.textContent.trim());
      }
    }
    return texts;
  });
}

async function isThinking() {
  return await page.evaluate(
    () => document.body.textContent?.includes("Thinking…") ?? false,
  );
}

try {
  // 1. Login
  console.log("→ Login as receptionist");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 20000,
  });
  console.log("✅ Logged in:", page.url());

  // 2. Open chat panel
  console.log("→ Opening chat panel");
  await page.click('button[aria-label="Open AI Assistant"]');
  await page.getByText("AI Health Assistant").waitFor({ timeout: 10000 });
  console.log("✅ Chat panel open");

  // 3. Send booking prompt — give the model all the info it needs
  const prompt =
    "Book an appointment for patient Rahul Kumar (MRN MRN-00001) with Dr. Rajesh Mehta in Cardiology for tomorrow at 10:00 AM. The patient phone is +91 98765 43210.";
  console.log("→ Sending prompt:", prompt);
  await page.fill('input[placeholder="Type a message…"]', prompt);
  await page.click('button[type="submit"]');

  // Wait for loading
  try {
    await page.getByText("Thinking…").waitFor({ timeout: 5000 });
    console.log("→ Thinking…");
  } catch {}

  // Wait up to 90s for reply (multi-step: search patient → get doctors → book)
  console.log("→ Waiting for reply (up to 90s)…");
  let lastTexts = [];
  for (let i = 0; i < 18; i++) {
    await page.waitForTimeout(5000);
    const texts = await getAssistantTexts();
    const thinking = await isThinking();
    console.log(
      `  [${(i + 1) * 5}s] thinking=${thinking}, replies=${texts.length}`,
    );
    if (!thinking && texts.length > 0) {
      lastTexts = texts;
      console.log(`→ Reply settled after ~${(i + 1) * 5}s`);
      break;
    }
    lastTexts = texts;
  }

  await snap("04-final");

  console.log("\n=== ASSISTANT REPLIES ===");
  if (lastTexts.length === 0) {
    console.log("(no assistant reply rendered)");
  } else {
    for (const t of lastTexts) console.log("•", t.slice(0, 800));
  }

  console.log("\n=== PAGE ERRORS ===");
  for (const e of pageErrors) console.log(e);
  if (pageErrors.length === 0) console.log("(none)");

  // Check for booking success
  const allText = lastTexts.join(" ").toLowerCase();
  const booked = allText.includes("booked") || allText.includes("successfully");
  console.log("\n=== VERDICT ===");
  console.log(
    booked
      ? "✅ Booking appears to have succeeded"
      : "❌ Booking did not succeed",
  );
} catch (e) {
  console.log("💥 Exception:", e.message);
  await snap("error");
}

await page.waitForTimeout(5000);
await context.close();
await browser.close();
