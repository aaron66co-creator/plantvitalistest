// בדיקת עשן בדפדפן (npm run smoke): מסלול משתמש חדש ופתיחת כל החלונות העיקריים — נכשלת על כל שגיאת JS.
// דורש Playwright (npx playwright, או התקנה גלובלית) ובנייה קיימת (npm run build). מריץ "vite preview" בעצמו ועוצר אותו בסוף
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pw; for (const p of ["playwright", "/opt/node22/lib/node_modules/playwright/index.mjs"]) { try { pw = await import(p); break; } catch {} }
if (!pw) { console.log("⚠️ Playwright לא מותקן — דילוג על בדיקת הדפדפן"); process.exit(0); }
const PORT = 4700 + Math.floor(Math.random() * 200);
const srv = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { cwd: root, stdio: "ignore" });
const stop = code => { try { srv.kill(); } catch {} process.exit(code); };
await new Promise(r => setTimeout(r, 3500));

const results = [];
async function run(mobile) {
  const exe = ["/opt/pw-browsers/chromium"].find(() => true);
  const b = await pw.chromium.launch(process.env.PLAYWRIGHT_BROWSERS_PATH ? { executablePath: exe } : {}).catch(() => pw.chromium.launch());
  const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem("__smoke")) { sessionStorage.setItem("__smoke", "1"); localStorage.setItem("wfpb_fresh_start_v", "1"); localStorage.setItem("pv_demo_terms_v1", "t"); sessionStorage.setItem("wfpb_unlocked_v1", "1"); sessionStorage.setItem("wfpb_session_active", "1"); } } catch {} });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
  const tag = mobile ? "טלפון" : "מחשב"; const step = async (name, fn) => { try { await fn(); await p.waitForTimeout(350); results.push([tag, name, errs.length ? "✗ " + errs.splice(0).join(" | ").slice(0, 160) : "✓"]); } catch (e) { results.push([tag, name, "✗ " + e.message.split("\n")[0].slice(0, 160)]); } };
  const btn = t => p.locator("button:visible", { hasText: t }).first();
  const closeAll = async () => { await p.keyboard.press("Escape"); for (const c of await p.locator("button:visible", { hasText: /^✕$/ }).all()) await c.click({ timeout: 1000 }).catch(() => {}); await p.waitForTimeout(250); };
  await p.goto(`http://localhost:${PORT}/`); await p.waitForTimeout(2500);
  await step("הצהרה ושאלון", async () => {
    await p.locator("input[type=checkbox]:visible").first().check(); await btn("המשך").click(); await p.waitForTimeout(600);
    const W = p.locator("[data-wizard]"); await W.locator("button", { hasText: "נקבה" }).click(); const ins = W.locator("input");
    await ins.nth(0).fill("45"); await ins.nth(1).fill("163"); await ins.nth(2).fill("78");
    await W.locator("button", { hasText: "המשך" }).click(); await p.waitForTimeout(300); await W.locator("button", { hasText: "ירידה במשקל" }).click();
    await W.locator("button", { hasText: "המשך" }).click(); await p.waitForTimeout(300); await W.locator("button", { hasText: "המשך" }).last().click(); await p.waitForTimeout(300);
    await W.locator("button", { hasText: "אין לי מצב רפואי" }).click(); await W.locator("button", { hasText: "סיום" }).click(); await p.waitForTimeout(1200); });
  await step("תפריט לשבוע", async () => { await btn("תפריט לשבוע").click(); for (let i = 0; i < 90; i++) { await p.waitForTimeout(1000); if (await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("wfpb_meals") || "{}")).length >= 7)) break; } await p.waitForTimeout(800); });
  await step("החלפת מנה 🔄", async () => { const s = p.locator("[data-swap-item]:visible"); if (await s.count()) await s.first().click(); });
  await step("ארוחה אחרת", async () => { const o = p.locator("[data-other-meal]:visible"); if (await o.count()) { await o.first().click(); await p.waitForTimeout(1500); } });
  await step("עוד פעולות", async () => { const m = btn("עוד פעולות"); if (await m.count()) await m.click(); });
  await step("רשימת קניות", async () => { await btn("רשימת קניות").click(); await p.waitForTimeout(500); await closeAll(); });
  await step("פרופיל והגדרות", async () => { await btn("הפרופיל").click(); await p.waitForTimeout(500); for (const s of await p.locator("summary:visible").all()) await s.click().catch(() => {}); await closeAll(); });
  for (const item of ["שאלו שאלה", "מדריך למשתמש", "שאלות ותשובות", "ספריית הידע", "מקורות הנתונים", "טבלת המזונות", "על האפליקציה"])
    await step(item, async () => { await btn("מידע").click(); await p.waitForTimeout(300); await btn(item).click(); await p.waitForTimeout(600); await closeAll(); });
  for (const tab of mobile ? ["תזונה", "יומן", "מתכונים", "ארוחות"] : ["אבות המזון", "מיקרו", "יומן", "מתכונים", "ארוחות"])
    await step("לשונית " + tab, async () => { const t = p.locator("button:visible", { hasText: tab }).last(); await t.click(); await p.waitForTimeout(700); });
  const hs = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1); results.push([tag, "בלי גלילה הצידה", hs ? "✗" : "✓"]);
  await b.close();
}
try { await run(true); await run(false); } catch (e) { results.push(["", "הרצה", "✗ " + e.message]); }
results.forEach(([t, n, r]) => console.log(`  ${r.startsWith("✓") ? "✓" : "✗"} ${t} · ${n}${r.startsWith("✗") ? " — " + r.slice(2) : ""}`));
const bad = results.filter(r => r[2].startsWith("✗")).length;
console.log(bad ? `\n❌ ${bad} בעיות` : "\n✅ כל המסכים נפתחו בלי שגיאות"); stop(bad ? 1 : 0);
