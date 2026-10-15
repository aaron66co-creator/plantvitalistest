// בדיקה אוטומטית לפני שחרור (npm run check): בונה את האפליקציה בלי דפדפן ומייצרת שבועות לכמה פרופילים.
// נכשלת (קוד יציאה 1) על קריסה, ערכים לא תקינים, ארוחה ריקה, פריט "0 יחידות" או ממוצע קלורי שבועי רחוק מהיעד;
// מדווחת אזהרות (לא נכשלת) על חריגים ביום בודד, מזון כפול בארוחה ופרי בשברים בביניים.
import { buildSync } from "esbuild";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FULL = process.argv.includes("--quick") ? 0 : 2; // --quick: בלי הסגנון המלא (איטי)
const src = readFileSync(path.join(root, "src/App.jsx"), "utf8") +
  "\nexport const __t={generateSimpleWeekPlan,generateWeekPlan,FDB,TEMP_FDB,DEF_RECIPES,recipeToFdbEntry,resolveHealthProfile,getDRI,ingNut,calcTDEE,goalPctOf,displayUnit,displayQtyG};\n";
const out = buildSync({ stdin: { contents: src, loader: "jsx", resolveDir: path.join(root, "src") }, bundle: true, write: false, format: "cjs", platform: "node",
  external: ["react", "react-dom"], logLevel: "silent", define: { "import.meta.env": JSON.stringify({ VITE_VARIANT: process.env.VITE_VARIANT || "" }) } });
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.sessionStorage = globalThis.localStorage; globalThis.window = globalThis;
globalThis.document = { addEventListener() {}, createElement() { return {}; }, documentElement: { style: {} } };
const mod = { exports: {} }; new Function("module", "exports", "require", out.outputFiles[0].text)(mod, mod.exports, createRequire(path.join(root, "src/x.js")));
const T = mod.exports.__t; T.DEF_RECIPES.forEach(r => { T.TEMP_FDB[r.id] = T.recipeToFdbEntry(r); });

const PROFILES = [
  { n: "שאלון: F45 ירידה", sex: "female", age: 45, height: 163, weight: 78, activity: "medium", goal: "lose" },
  { n: "F55 יעד 1,200", sex: "female", age: 55, height: 160, weight: 69, activity: "sedentary", goal: "lose" },
  { n: "M45 ירידה", sex: "male", age: 45, height: 178, weight: 105, activity: "low", goal: "lose" },
  { n: "F67 ירידה", sex: "female", age: 67, height: 160, weight: 80, activity: "low", goal: "lose" },
  { n: "F30 שמירה", sex: "female", age: 30, height: 165, weight: 62, activity: "medium", goal: "maintain" },
  { n: "M30 עלייה", sex: "male", age: 30, height: 180, weight: 75, activity: "high", goal: "gain" },
];
const BASE = fk => { const h = (T.FDB[fk] || T.TEMP_FDB[fk] || {}).he || fk;
  return /תורמוס/.test(h) ? "lupin" : /טופו/.test(h) ? "tofu" : /יוגורט סויה/.test(h) ? "soyYog" : /משקה סויה/.test(h) ? "soyMilk" : fk; };
const MEALS = ["breakfast", "snack", "lunch", "dinner"];
let fails = 0, warns = 0;
const fail = m => { fails++; console.log("  ✗ " + m); }, warn = m => { warns++; if (process.argv.includes("-v")) console.log("  ! " + m); };

function checkWeek(label, p, mode) {
  p.medical = ["none"]; const hp = T.resolveHealthProfile(p); const dri = T.getDRI(p.age, p.sex, false); dri._naCap = hp.sodiumMax;
  const tdee = T.calcTDEE(p.height, p.weight, p.age, p.sex, p.activity); const tgt = Math.round(tdee * (1 + T.goalPctOf(p, tdee)));
  const t0 = Date.now(); let wk;
  try { wk = mode === "simple" ? T.generateSimpleWeekPlan(tgt, T.DEF_RECIPES, dri, p.weight, hp, new Set(), { alaMin: p.sex === "male" ? 1.6 : 1.1 })
    : T.generateWeekPlan(tgt, p.weight, hp, dri, T.DEF_RECIPES.map(r => r.id), new Set()); }
  catch (e) { fail(`${label}: קריסה — ${e.message}`); return; }
  const W = wk.week || wk, secs = ((Date.now() - t0) / 1000).toFixed(1); const days = Object.keys(W).filter(k => /^d\d$/.test(k)).sort();
  if (days.length !== 7) fail(`${label}: ${days.length} ימים במקום 7`);
  let sumK = 0, iss = { dup: 0, frac: 0, out: 0 };
  for (const d of days) { let k = 0;
    for (const mk of MEALS) { const arr = W[d][mk] || []; if (!arr.length) fail(`${label} ${d}.${mk}: ארוחה ריקה`); const seen = {};
      for (const it of arr) { const n = T.ingNut(it.fk, it.g, it.soaked); if (!it.fk || !(it.g > 0) || !Number.isFinite(n.kcal)) { fail(`${label} ${d}.${mk}: פריט לא תקין ${it.fk} ${it.g}`); continue; }
        k += n.kcal; const fd = T.FDB[it.fk] || T.TEMP_FDB[it.fk];
        if (fd && ["אגוזים", "זרעים"].includes(fd.cat) && it.g > 45) fail(`${label} ${d}.${mk}: ${fd.he} ${Math.round(it.g)} גר' (אגוזים/זרעים — עד מנה רגילה)`); const b = BASE(it.fk); if (mk !== "snack" && seen[b] && b !== it.fk) iss.dup++; seen[b] = 1;
        if (fd && !fd._isRecipe && fd.cat !== "תבלינים") { const su = T.displayUnit(it.fk, fd, "he"); if (su && !su.weightOnly && su.g) { const q = T.displayQtyG(it.fk, fd, it.g) / su.g * (su.count || 1);
          if (q < 0.125) fail(`${label} ${d}.${mk}: כמות זעירה ${fd.he} ${q.toFixed(2)}`);
          if (mk === "snack" && fd.cat === "פרי" && Math.abs(q - Math.round(q)) > 0.01) iss.frac++; } } } }
    for (const mk of ["breakfast", "lunch", "dinner"]) { const km = (W[d][mk] || []).reduce((t, it) => t + (T.ingNut(it.fk, it.g, it.soaked).kcal || 0), 0); if (k > 0 && km / k > 0.45) { iss.share = (iss.share || 0) + 1; warn(`${label} ${d}.${mk}: ${Math.round(km / k * 100)}% מהיום`); } }
    sumK += k; const lim = tgt <= 1250 ? 0.1 : 0.08; if (Math.abs(k - tgt) > tgt * lim) { iss.out++; warn(`${label} ${d}: ${Math.round(k)} קק״ל מול ${tgt}`); } }
  const avg = sumK / days.length, lim = tgt <= 1250 ? 0.08 : 0.05;
  if (Math.abs(avg - tgt) > tgt * lim) fail(`${label}: ממוצע ${Math.round(avg)} קק״ל מול יעד ${tgt}`);
  warns += iss.dup + iss.frac;
  console.log(`  ${Math.abs(avg - tgt) <= tgt * lim ? "✓" : "✗"} ${label} — יעד ${tgt}, ממוצע ${Math.round(avg)} (${secs} ש׳)${iss.out ? ` · ימים חריגים ${iss.out}` : ""}${iss.dup ? ` · כפילות ${iss.dup}` : ""}${iss.frac ? ` · פרי בשברים ${iss.frac}` : ""}${iss.share ? ` · ארוחה מעל 45% ${iss.share}` : ""}`);
}
console.log("🔎 בדיקת תפריטים — סגנון פשוט");
PROFILES.forEach(p => checkWeek(p.n, { ...p }, "simple"));
if (FULL) { console.log("🔎 סגנון מלא"); PROFILES.slice(0, FULL).forEach(p => checkWeek(p.n, { ...p }, "full")); }
console.log(fails ? `\n❌ ${fails} כשלים, ${warns} אזהרות` : `\n✅ הכל תקין (${warns} אזהרות${warns && !process.argv.includes("-v") ? " — פירוט: -v" : ""})`);
process.exit(fails ? 1 : 0);
